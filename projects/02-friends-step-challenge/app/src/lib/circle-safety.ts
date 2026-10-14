import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';

import {
  createCircleReportId,
  isCircleReportStatus,
  isReportReason,
  isReportTargetType,
  isValidReportTargetId,
  type CircleReportStatus,
  type ReportReason,
  type ReportTargetType,
} from '@/domain/moderation';
import { database, requireFirebase } from '@/lib/firebase';
import type { CircleRole } from '@/domain/circles';

const REPORT_PAGE_SIZE = 30;
const MAX_REPORT_TEXT = 500;
const MAX_REPORT_LABEL = 100;

export type CircleSafetyReport = {
  createdAt: Date | null;
  details: string;
  id: string;
  reason: ReportReason;
  reporterId: string;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  resolution: string | null;
  status: CircleReportStatus;
  targetId: string;
  targetLabel: string;
  targetPreview: string;
  targetType: ReportTargetType;
};

export type BlockedPerson = {
  displayName: string;
  userId: string;
};

export type CircleReportCursor = QueryDocumentSnapshot<DocumentData>;

export type CircleReportPage = {
  cursor: CircleReportCursor | null;
  hasMore: boolean;
  reports: CircleSafetyReport[];
};

export async function createCircleReport(input: {
  circleId: string;
  details: string;
  reason: ReportReason;
  reporterId: string;
  targetId: string;
  targetLabel: string;
  targetPreview?: string;
  targetType: ReportTargetType;
}) {
  if (!isReportTargetType(input.targetType) || !isReportReason(input.reason) || !isValidReportTargetId(input.targetId)) {
    throw new Error('This report could not be sent. Check the item and try again.');
  }
  if (!input.circleId || !input.reporterId || (input.targetType === 'circle' && input.targetId !== input.circleId)) {
    throw new Error('This report could not be sent. The circle is unavailable.');
  }
  if ((input.targetType === 'member' || input.targetType === 'profile') && input.targetId === input.reporterId) {
    throw new Error('You cannot report your own profile.');
  }

  const db = requireFirebase(database, 'Firestore');
  const reportId = createCircleReportId(input.reporterId, input.targetType, input.targetId);
  const reportReference = doc(db, 'circles', input.circleId, 'reports', reportId);
  const targetLabel = input.targetLabel.trim().slice(0, MAX_REPORT_LABEL);
  const targetPreview = (input.targetPreview ?? '').trim().slice(0, MAX_REPORT_TEXT);
  const details = input.details.trim().slice(0, MAX_REPORT_TEXT);

  // This is create-only under Firestore Rules. Avoid reading private reports
  // before writing so ordinary members can submit without read access.
  await setDoc(reportReference, {
    circleId: input.circleId,
    createdAt: serverTimestamp(),
    details,
    reason: input.reason,
    reporterId: input.reporterId,
    schemaVersion: 1,
    status: 'open',
    targetId: input.targetId,
    targetLabel,
    targetPreview,
    targetType: input.targetType,
  });
}

export async function loadCircleReports(input: {
  after?: CircleReportCursor | null;
  circleId: string;
  status: 'open' | 'reviewed';
}): Promise<CircleReportPage> {
  const db = requireFirebase(database, 'Firestore');
  const reportCollection = collection(db, 'circles', input.circleId, 'reports');
  const statusFilter = input.status === 'open'
    ? where('status', '==', 'open')
    : where('status', 'in', ['resolved', 'dismissed']);
  const reportsQuery = query(
    reportCollection,
    statusFilter,
    orderBy('createdAt', 'desc'),
    ...(input.after ? [startAfter(input.after)] : []),
    limit(REPORT_PAGE_SIZE),
  );
  const snapshot = await getDocs(reportsQuery);
  const reports = snapshot.docs.flatMap((report) => {
    const parsed = readCircleReport(report.id, report.data());
    return parsed ? [parsed] : [];
  });
  return {
    cursor: snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1]! : null,
    hasMore: snapshot.size === REPORT_PAGE_SIZE,
    reports,
  };
}

export async function reviewCircleReport(input: {
  circleId: string;
  disposition: 'resolved' | 'dismissed';
  reportId: string;
  reviewerId: string;
}) {
  const db = requireFirebase(database, 'Firestore');
  await updateDoc(doc(db, 'circles', input.circleId, 'reports', input.reportId), {
    resolvedAt: serverTimestamp(),
    resolvedBy: input.reviewerId,
    resolution: input.disposition === 'resolved' ? 'Reviewed and addressed by circle moderators.' : 'Reviewed and dismissed by circle moderators.',
    status: input.disposition,
    updatedAt: serverTimestamp(),
  });
}

export async function setCircleMemberRole(input: {
  circleId: string;
  memberId: string;
  role: Exclude<CircleRole, 'owner'>;
}) {
  const db = requireFirebase(database, 'Firestore');
  const memberReference = doc(db, 'circles', input.circleId, 'members', input.memberId);
  const membershipReference = doc(db, 'users', input.memberId, 'circleMemberships', input.circleId);

  await runTransaction(db, async (transaction) => {
    const [memberSnapshot, membershipSnapshot] = await Promise.all([
      transaction.get(memberReference),
      transaction.get(membershipReference),
    ]);
    if (!memberSnapshot.exists() || !membershipSnapshot.exists()) {
      throw new Error('This member is no longer in the circle.');
    }
    if (memberSnapshot.data().role === 'owner') {
      throw new Error('The circle owner cannot be assigned another role.');
    }
    transaction.update(memberReference, { role: input.role });
    transaction.update(membershipReference, { role: input.role });
  });
}

export function watchBlockedPeople(
  userId: string,
  onChange: (people: BlockedPerson[]) => void,
  onError: () => void,
): Unsubscribe {
  const db = requireFirebase(database, 'Firestore');
  return onSnapshot(
    collection(db, 'users', userId, 'blocks'),
    (snapshot) => onChange(snapshot.docs.map((record) => ({
      displayName: typeof record.data().displayName === 'string' && record.data().displayName.trim()
        ? record.data().displayName.trim()
        : 'Stride Circle member',
      userId: record.id,
    }))),
    onError,
  );
}

export async function blockPerson(input: { displayName: string; blockedUserId: string; userId: string }) {
  if (!input.userId || !input.blockedUserId || input.userId === input.blockedUserId) {
    throw new Error('You cannot block this person.');
  }
  const db = requireFirebase(database, 'Firestore');
  const blockReference = doc(db, 'users', input.userId, 'blocks', input.blockedUserId);
  await runTransaction(db, async (transaction) => {
    const previousBlock = await transaction.get(blockReference);
    if (previousBlock.exists()) return;
    transaction.set(blockReference, {
      blockedUserId: input.blockedUserId,
      createdAt: serverTimestamp(),
      displayName: input.displayName.trim().slice(0, MAX_REPORT_LABEL) || 'Stride Circle member',
      schemaVersion: 1,
    });
  });
}

export async function unblockPerson(input: { blockedUserId: string; userId: string }) {
  const db = requireFirebase(database, 'Firestore');
  await deleteDoc(doc(db, 'users', input.userId, 'blocks', input.blockedUserId));
}

function readCircleReport(id: string, value: Record<string, unknown>): CircleSafetyReport | null {
  if (
    !isReportReason(value.reason)
    || !isReportTargetType(value.targetType)
    || !isCircleReportStatus(value.status)
    || typeof value.targetId !== 'string'
    || typeof value.reporterId !== 'string'
  ) return null;

  return {
    createdAt: toDate(value.createdAt),
    details: typeof value.details === 'string' ? value.details : '',
    id,
    reason: value.reason,
    reporterId: value.reporterId,
    resolvedAt: toDate(value.resolvedAt),
    resolvedBy: typeof value.resolvedBy === 'string' ? value.resolvedBy : null,
    resolution: typeof value.resolution === 'string' ? value.resolution : null,
    status: value.status,
    targetId: value.targetId,
    targetLabel: typeof value.targetLabel === 'string' ? value.targetLabel : 'Reported item',
    targetPreview: typeof value.targetPreview === 'string' ? value.targetPreview : '',
    targetType: value.targetType,
  };
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  return null;
}
