"use client";

import {
    DynamicContextProvider
} from "@dynamic-labs/sdk-react-core";



export default function DynamicTonWrapper({ children }: { children: React.ReactNode }) {
    return (
        <DynamicContextProvider
            settings={{
                environmentId: "a8444133-72f4-4930-aa71-f471279cd4a4",
                walletConnectors: [],
            }}
        >
            {children}
        </DynamicContextProvider>
    );
}
