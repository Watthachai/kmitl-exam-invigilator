// src/app/(auth)/error/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';

export default function ErrorPage() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    let message = 'An error occurred during sign-in.';
    if (error === 'OAuthAccountNotLinked') {
        message =
            'This email is already linked with another account. Please sign in using the original provider.';
    } else if (error) { // Add a case to display other errors (decoded) - IMPORTANT for debugging
        message = `Authentication Error: ${decodeURIComponent(error)}`; // Display the raw error, decoded
    }


    return (
        <div>
            <h1>Sign-in Error</h1>
            <p>{message}</p>
        </div>
    );
}