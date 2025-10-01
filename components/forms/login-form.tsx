"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";
import { type UserError } from "@/lib/utils/error-handler";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [userError, setUserError] = useState<UserError | null>(null);
  const router = useRouter();
  const { login, handleAuthRedirect } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setUserError(null);
    
    try {
      await login(data.email, data.password);
      console.log('✅ Login successful, redirecting...');
      // Use the auth store's redirect logic for consistent routing
      const redirectPath = handleAuthRedirect();
      router.push(redirectPath);
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Check if the error is from auth store's lastError
      const authState = useAuthStore.getState();
      if (authState.lastError) {
        setUserError(authState.lastError);
        
        // Handle specific error actions
        if (authState.lastError.action === 'login' && authState.lastError.redirectTo) {
          // Redirect for profile completion
          setTimeout(() => {
            router.push(authState.lastError!.redirectTo!);
          }, 2000);
        }
      } else {
        // Fallback for unexpected errors
        setUserError({
          message: 'Sign in failed. Please check your email and password and try again.',
          action: 'retry',
          technical: error?.message || 'Login failed'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-background-secondary border border-neutral-800 rounded-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-serif font-light mb-2 text-text-primary">
            Welcome Back
          </h2>
          <p className="text-text-muted font-light">
            Sign in to your MOSÉ account
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {userError && (
            <div className={`border rounded-lg p-4 ${
              userError.action === 'login' 
                ? 'bg-blue-500/10 border-blue-500/20' 
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              <p className={`text-sm font-medium mb-2 ${
                userError.action === 'login' 
                  ? 'text-blue-400' 
                  : 'text-red-400'
              }`}>
                {userError.message}
              </p>
              
              {userError.action === 'login' && userError.redirectTo && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-muted">
                    Redirecting to complete setup...
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(userError.redirectTo!)}
                    className="text-xs"
                  >
                    Complete Setup
                  </Button>
                </div>
              )}
              
              {userError.action === 'contact_support' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => router.push('/support')}
                  className="text-xs mt-2"
                >
                  Contact Support
                </Button>
              )}
              
              {userError.action === 'retry' && (
                <p className="text-xs text-text-muted mt-1">
                  Please check your credentials and try again.
                </p>
              )}
              
              {userError.action === 'different_email' && (
                <div className="mt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => router.push('/register')}
                    className="text-xs"
                  >
                    Create New Account
                  </Button>
                </div>
              )}
            </div>
          )}
          
          <div>
            <Input
              {...register("email")}
              type="email"
              placeholder="Email address"
              error={errors.email?.message}
              className="bg-background-tertiary border-neutral-700 text-text-primary placeholder:text-text-muted"
            />
          </div>

          <div>
            <Input
              {...register("password")}
              type="password"
              placeholder="Password"
              error={errors.password?.message}
              className="bg-background-tertiary border-neutral-700 text-text-primary placeholder:text-text-muted"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center space-x-2 text-text-secondary">
              <input
                type="checkbox"
                className="w-4 h-4 bg-background-tertiary border-neutral-700 rounded"
              />
              <span>Remember me</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-text-primary hover:text-text-secondary transition-colors underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-text-primary text-background-primary hover:bg-text-secondary font-medium"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-neutral-800 text-center">
          <p className="text-text-muted">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-text-primary hover:text-text-secondary transition-colors underline font-medium"
            >
              Create account
            </Link>
          </p>
        </div>

        {/* Social Login */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background-secondary px-4 text-text-muted">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="bg-background-tertiary border-neutral-700 text-text-primary hover:bg-neutral-800"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>
            <Button
              variant="outline"
              className="bg-background-tertiary border-neutral-700 text-text-primary hover:bg-neutral-800"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
              </svg>
              Twitter
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 