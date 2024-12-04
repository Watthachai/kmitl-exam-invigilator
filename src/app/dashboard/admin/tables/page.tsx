"use client";

import { useSession } from "next-auth/react";

export default function TablePage() {
  const { data: session, status } = useSession();

  return (
    <div>
      <h1>Table Page</h1>
      <p>Logged in as: {session?.user?.email}</p>
    </div>
  );
}
