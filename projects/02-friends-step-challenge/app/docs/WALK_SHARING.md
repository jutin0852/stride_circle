# Saved walks and sharing

- Finish & save creates the private walk. Save on the summary updates that same walk's title and private notes; it does not create another walk.
- Local storage must succeed before the summary says Saved. The button is busy during the write, duplicate submissions are locked, and failures keep the draft available for retry. Account synchronization remains background work; Saved is not a claim that cloud delivery has completed.
- Include route map is stored with the walk and applies only to shared output. Street/place labels are opt-in for the current summary session and remain off on a new visit. Both controls live on the summary, outside the share overlay.
- Sharing previews the saved walk. Save title/note edits before sharing if you want the updated title to appear.
- The share overlay contains the preview, photo/route appearance controls and Share. The native destination picker opens only after the selected image/map has loaded. Close cancels preparation; the system's Cancel handles an already-open native share panel.
- Add photo uses the system image-library picker, not the camera. Photos are presentation-only, are not uploaded into the walk record and are not durable saved backgrounds. Choosing a new photo or closing the summary does not modify the GPS recording.
- The preview draws the allowlisted, privacy-filtered route over the photo, with a dark scrim and a contrasting route line. Exact endpoints, raw samples and private notes are not supplied to the share card. Include route map off suppresses the route in photo mode too.
- Native sharing captures the composition to PNG; it does not share the source photo file or its metadata. A photo's visible content can still identify a place, so users should choose photos they are comfortable sharing.
- Exporting a standalone transparent SVG/route sticker and saving photo backgrounds across devices are not included in this slice.

## Native verification

The development client must include expo-image-picker and the updated plugin configuration. On iOS and Android, check picker cancellation, large/dark/light photos, failed image loading, endpoint privacy, Include route map off, and the actual shared PNG. Component tests do not prove native picker or capture rendering.
