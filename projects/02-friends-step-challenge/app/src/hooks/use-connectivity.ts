import { createContext, useContext } from 'react';

export type Connectivity = { offline: boolean };

/** Provided by ConnectivityProvider; screens outside it are treated as online. */
export const ConnectivityContext = createContext<Connectivity>({ offline: false });

export function useConnectivity() {
  return useContext(ConnectivityContext);
}
