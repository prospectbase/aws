"use client";

import "./amplify.scss";
import "@/amplify-client";
import { Authenticator } from "@aws-amplify/ui-react";
import { Hub } from "aws-amplify/utils";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function () {
    const router = useRouter();

    useEffect(() => {
        Hub.listen("auth", (data) => {
            console.log(data);
            if (data.payload.event === "signedIn") {
                router.push("/build");
            }
        });
    }, []);

    return (
        <>
            <div className="h-[412px]">
                <Authenticator hideSignUp={true}>
                    {({ signOut, user }) => (
                        <div className="flex flex-col gap-4 items-center">
                            <div className="text-lg">You are signed in as {user?.signInDetails?.loginId}</div>
                            <button className="w-1/2 bg-primary caption px-4 py-2 text-lg mt-4 text-white rounded-md hover:bg-pri-600" onClick={signOut}>
                                Sign-out
                            </button>
                        </div>
                    )}
                </Authenticator>
            </div>
        </>
    );
}
