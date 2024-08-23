"use client";

import "@/amplify-client";
import { useRouter } from "next/navigation";
import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {signIn, confirmSignIn, getCurrentUser, signOut, } from 'aws-amplify/auth'

interface AuthError extends Error {
    name: string;
}

interface Props {
    onLogin?: (id: string, email: string) => void
}

export default function({ onLogin }: Props) {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [repeat, setRepeat] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [step, setStep] = useState("");

    async function onSignIn() {
        setLoading(true);
        try {
            const response = await signIn({username: email, password});
            console.log(response)
            if (response.isSignedIn) {
                // Success
                const user = await getCurrentUser()
                if (onLogin) {
                    onLogin(user.userId, user.signInDetails?.loginId || "");
                }
            } else {
                if (response.nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
                    setPassword("");
                    setRepeat("");
                    setStep(response.nextStep.signInStep)
                }
            }
        } catch (e) {
            const error = e as AuthError;
            console.log(error)
            if (error.name === "NotAuthorizedException") {
                // Bad account/password
                setError("Incorrect username or password");
            }
        }
        setLoading(false);
    }

    async function onChangePassword() {
        setLoading(true);
        try {
            await confirmSignIn({challengeResponse: newPassword});
            const user = await getCurrentUser();
            console.log(user);
        } catch (e) {
            const error = e as AuthError;
            console.log(error)
            // if (error.name === "NotAuthorizedException") {
            //     // Bad account/password
            //     setError("Incorrect username or password");
            // }
        }
        setLoading(false);
    }

    async function checkLoggedin() {
        try {
            const user = await getCurrentUser();
            console.log(user);
            setStep("LOGOUT");
            setEmail(user.signInDetails?.loginId || "");
        }
        catch {
            setStep("LOGIN");
        }
    }

    async function out() {
        await signOut()
        await checkLoggedin();
        console.log("Signed out")
    }

    useEffect(() => {
        checkLoggedin();
    }, []);

    return (
        <div className="h-96 flex flex-col gap-3">
            {step === "LOGOUT" && (
                <>
                    <div className="text-3xl font-medium text-muted text-center">{email}</div>
                    <div className="flex justify-center mt-8">
                        <Button variant="secondary" size="sm" onClick={out}>Logout</Button>
                    </div>
                </>
            )}
            {step === "LOGIN" && (
                <>
                    <div className="text-3xl font-medium text-muted text-center">Welcome</div>
                    <div className=" text-muted p-1 text-center mb-4">Log in to continue to Flowjob</div>
                    <input type="text" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} className="border p-2 rounded-sm text-lg outline-none focus:ring-1"/>
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} className="border p-2 rounded-sm text-lg outline-none focus:ring-1"/>
                    <div className="text-red-500 px-1 h-6">{error}</div>
                    <Button className="bg-red-500 outline-none p-6 text-base hover:bg-red-600" size="lg" onClick={onSignIn} disabled={!email || !password || loading}>Log in</Button>
                    <div className="text-muted opacity-50 px-1">Forgotten password?</div>
                </>
            )}
            {step === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED" && (
                <>
                    <div className="text-3xl font-medium text-muted text-center">Set Password</div>
                    <div className=" text-muted p-1 text-center mb-4">Set your password</div>
                    <input type="password" placeholder="Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={loading} className="border p-2 rounded-sm text-lg outline-none focus:ring-1"/>
                    <input type="password" placeholder="Repeat password" value={repeat} onChange={(e) => setRepeat(e.target.value)} disabled={loading} className="border p-2 rounded-sm text-lg outline-none focus:ring-1"/>
                    <div className="text-red-500 px-1 h-6">{error}</div>
                    <Button className="bg-red-500 outline-none p-6 text-base hover:bg-red-600" size="lg" onClick={onChangePassword} disabled={!newPassword || !repeat || loading}>Change Password</Button>
                </>
            )}
        </div>
    );
}
