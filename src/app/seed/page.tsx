// src/app/seed/page.tsx
"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Database } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { seedInitialData } from "@/app/actions";

export default function SeedPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSeeding, startSeedingTransition] = useTransition();

  const handleSeed = () => {
    startSeedingTransition(async () => {
      const result = await seedInitialData();
      if (result.success) {
        toast({
          title: "Database Seeding",
          description: result.message,
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <main className="flex justify-center items-start min-h-screen bg-background p-4 sm:p-6 md:p-10">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-4">
             <Link href="/">
                <Button variant="ghost" size="icon">
                    <ArrowLeft />
                </Button>
            </Link>
            <div>
              <CardTitle>Seed Initial Database</CardTitle>
              <CardDescription>
                Populate the database with initial classes, subjects, and students. This only needs to be run once.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">
                Clicking the button below will check if your database is empty. If it is, it will add the default classes (Jr. KG to 10th Standard), subjects (Math, Science, etc.), and a sample list of students for the 6th Standard class.
            </p>
            <p className="mt-4 font-semibold text-destructive">
                Warning: This process is designed to run on an empty database. If you have existing data, it might not run.
            </p>
        </CardContent>
        <CardFooter>
            <Button size="lg" onClick={handleSeed} disabled={isSeeding}>
              {isSeeding ? <Loader2 className="animate-spin" /> : <Database />}
              <span>Seed Database</span>
            </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
