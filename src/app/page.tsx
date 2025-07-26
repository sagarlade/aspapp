// src/app/page.tsx
"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
     <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground p-4 shadow-md flex justify-between items-center">
        <h1 className="font-headline text-3xl">MarkShare Dashboard</h1>
        <div className="flex items-center gap-4">
            <span className="text-sm">Welcome, {user?.email}</span>
            <Button variant="secondary" size="sm" onClick={handleLogout}>Logout</Button>
        </div>
      </header>
      <main className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle>Enter Marks</CardTitle>
                    <CardDescription>Enter and save student marks for a subject.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.push('/dashboard/marks')}>Go to Marks Entry</Button>
                </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle>Add Student</CardTitle>
                    <CardDescription>Add a new student to a class.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.push('/dashboard/add-student')}>Add New Student</Button>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
