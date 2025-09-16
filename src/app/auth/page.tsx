"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Chrome } from "lucide-react"
import { toast } from "sonner"

export default function AuthPage() {
  const { currentUser, signInWithGoogle, loading } = useAuth()
  const router = useRouter()

  // Redirect if authenticated
  useEffect(() => {
    if (currentUser && !loading) {
      router.push("/dashboard")
    }
  }, [currentUser, loading, router])

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle()
      toast.success("Successfully signed in!")
    } catch (error) {
      toast.error("Failed to sign in. Please try again.")
      console.error("Sign in error:", error)
    }
  }

  // Loading spinner while Firebase checks auth
  if (loading || currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-white to-teal-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Chrome className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Adobe Editor Dashboard
          </CardTitle>
          <CardDescription>
            Sign in to manage your clients, products, and invoices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGoogleSignIn} className="w-full" size="lg">
            <Chrome className="mr-2 h-5 w-5" />
            Continue with Google
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            By signing in, you agree to our terms of service and privacy policy.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}