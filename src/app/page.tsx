
// src/app/page.tsx
"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, Pencil, UserPlus, FileText, ClipboardList, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function HomePage() {
  const { user, loading, logout, userRole } = useAuth();
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
      <div className="flex justify-center items-center min-h-screen bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const getInitials = (email: string | null | undefined) => {
    if (!email) return 'U';
    return email.charAt(0).toUpperCase();
  }

  return (
     <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground p-4 shadow-md flex justify-between items-center">
        <h1 className="font-headline text-xl md:text-3xl">MarkShare Dashboard</h1>
        <div className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src={user.photoURL || ''} alt="User profile picture" />
              <AvatarFallback className="bg-card text-card-foreground">{getInitials(user.email)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-right">
                <span className="text-sm font-semibold">{user.email}</span>
                <span className="text-xs uppercase font-bold tracking-wider">{userRole}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={handleLogout}>Logout</Button>
        </div>
      </header>
      <main className="p-4 sm:p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                        <Pencil className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle>Enter Marks</CardTitle>
                        <CardDescription>Enter and save student marks for an exam.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.push('/dashboard/marks')}>Go to Marks Entry</Button>
                </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                        <UserPlus className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle>Add Student</CardTitle>
                        <CardDescription>Add a new student to a class.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.push('/dashboard/add-student')}>Add New Student</Button>
                </CardContent>
            </Card>
             <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                        <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle>Add Multiple Students</CardTitle>
                        <CardDescription>Add a list of students to a class at once.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.push('/dashboard/add-students')}>Bulk Add Students</Button>
                </CardContent>
            </Card>
            {userRole === 'admin' && (
                <>
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle>View Report</CardTitle>
                            <CardDescription>See a consolidated report of all marks.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/dashboard/report')}>View Full Report</Button>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <ClipboardList className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Manage Exams</CardTitle>
                            <CardDescription>Create or delete exams and set total marks.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/dashboard/exams')}>Go to Exams</Button>
                    </CardContent>
                </Card>
                </>
            )}
        </div>
      </main>
    </div>
  );
}
