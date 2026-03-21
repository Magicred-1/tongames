"use client";

import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { TonWalletConnectors }    from "@dynamic-labs/ton";
import { useRouter }              from "next/navigation";



export default function DynamicTonWrapper({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    return (
        <DynamicContextProvider
            settings={{
                environmentId: "a8444133-72f4-4930-aa71-f471279cd4a4",
                walletConnectors: [new TonWalletConnectors()],
                events: {
                    onLogout: (args) => {
                        router.push("/login");
                        console.log("User logged out", args);
                    },
                }
            }}
        >
            {children}
        </DynamicContextProvider>
    );
}
