"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";
import { type UserError } from "@/lib/utils/error-handler";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  role: z.enum(["buyer", "seller", "admin"]),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms and conditions",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [userError, setUserError] = useState<UserError | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register: registerUser, handleAuthRedirect } = useAuthStore();

  // Get role from URL parameters
  const roleFromUrl = searchParams.get('role');
  const defaultRole = (roleFromUrl === 'seller' || roleFromUrl === 'buyer' || roleFromUrl === 'admin') ? roleFromUrl : 'buyer';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: defaultRole as "buyer" | "seller" | "admin",
    },
  });

  // Set role from URL on component mount
  useEffect(() => {
    if (roleFromUrl === 'seller' || roleFromUrl === 'buyer' || roleFromUrl === 'admin') {
      setValue('role', roleFromUrl as "buyer" | "seller" | "admin");
    }
  }, [roleFromUrl, setValue]);

  const selectedRole = watch("role");

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setUserError(null);
    
    try {
      const result = await registerUser(data.email, data.password, data.name, data.role);
      
      if (result.success) {
        console.log('✅ Registration successful, redirecting...');
        // Use the auth store's redirect logic for consistent routing
        const redirectPath = handleAuthRedirect();
        router.push(redirectPath);
      } else {
        // Handle structured error response
        console.log('❌ Registration failed:', result.error?.message);
        setUserError(result.error || null);
        
        // Handle specific error actions
        if (result.error?.action === 'login' && result.error.redirectTo) {
          // Account already exists - redirect to login after a delay
          setTimeout(() => {
            router.push(result.error!.redirectTo!);
          }, 2000);
        }
      }
    } catch (error: any) {
      // Fallback for unexpected errors (should not happen with new system)
      console.error("Unexpected registration error:", error);
      setUserError({
        message: 'Something went wrong. Please try again or contact support if the problem persists.',
        action: 'retry',
        technical: error?.message || 'Unexpected error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-background-secondary border border-neutral-800 rounded-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-serif font-light mb-2 text-text-primary">
            Join MOSÉ
          </h2>
          <p className="text-text-muted font-light">
            Create your account to discover authentic African art
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
                    Redirecting to sign in page...
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(userError.redirectTo!)}
                    className="text-xs"
                  >
                    Sign In Now
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
                  Please correct the issue and try again.
                </p>
              )}
            </div>
          )}
          
          {/* Role Selection */}
          <div>
            <label className="text-sm font-medium text-text-secondary mb-3 block">
              I want to:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="relative cursor-pointer">
                <input
                  {...register("role")}
                  type="radio"
                  value="buyer"
                  className="sr-only"
                />
                <div
                  className={`p-4 border rounded-lg text-center transition-colors ${
                    selectedRole === "buyer"
                      ? "border-text-primary bg-text-primary text-background-primary"
                      : "border-neutral-700 bg-background-tertiary text-text-secondary hover:border-neutral-600"
                  }`}
                >
                  <div className="text-2xl mb-2">🛍️</div>
                  <div className="font-medium">Buy Art</div>
                  <div className="text-xs opacity-75">Discover & collect</div>
                </div>
              </label>
              <label className="relative cursor-pointer">
                <input
                  {...register("role")}
                  type="radio"
                  value="seller"
                  className="sr-only"
                />
                <div
                  className={`p-4 border rounded-lg text-center transition-colors ${
                    selectedRole === "seller"
                      ? "border-text-primary bg-text-primary text-background-primary"
                      : "border-neutral-700 bg-background-tertiary text-text-secondary hover:border-neutral-600"
                  }`}
                >
                  <div className="text-2xl mb-2">🎨</div>
                  <div className="font-medium">Sell Art</div>
                  <div className="text-xs opacity-75">Share your creations</div>
                </div>
              </label>
              <label className="relative cursor-pointer">
                <input
                  {...register("role")}
                  type="radio"
                  value="admin"
                  className="sr-only"
                />
                <div
                  className={`p-4 border rounded-lg text-center transition-colors ${
                    selectedRole === "admin"
                      ? "border-text-primary bg-text-primary text-background-primary"
                      : "border-neutral-700 bg-background-tertiary text-text-secondary hover:border-neutral-600"
                  }`}
                >
                  <div className="text-2xl mb-2">👑</div>
                  <div className="font-medium">Admin</div>
                  <div className="text-xs opacity-75">Manage platform</div>
                </div>
              </label>
            </div>
            {errors.role && (
              <p className="text-red-400 text-sm mt-1">{errors.role.message}</p>
            )}
          </div>

          <div>
            <Input
              {...register("name")}
              type="text"
              placeholder="Full name"
              error={errors.name?.message}
              className="bg-background-tertiary border-neutral-700 text-text-primary placeholder:text-text-muted"
            />
          </div>

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
              placeholder="Password (min. 8 characters)"
              error={errors.password?.message}
              className="bg-background-tertiary border-neutral-700 text-text-primary placeholder:text-text-muted"
            />
          </div>

          <div>
            <Input
              {...register("confirmPassword")}
              type="password"
              placeholder="Confirm password"
              error={errors.confirmPassword?.message}
              className="bg-background-tertiary border-neutral-700 text-text-primary placeholder:text-text-muted"
            />
          </div>

          <div>
            <label className="flex items-start space-x-3 text-sm text-text-secondary">
              <input
                {...register("agreeToTerms")}
                type="checkbox"
                className="w-4 h-4 mt-0.5 bg-background-tertiary border-neutral-700 rounded"
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="text-text-primary underline hover:text-text-secondary">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-text-primary underline hover:text-text-secondary">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {errors.agreeToTerms && (
              <p className="text-red-400 text-sm mt-1">{errors.agreeToTerms.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-text-primary text-background-primary hover:bg-text-secondary font-medium"
          >
            {isLoading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-neutral-800 text-center">
          <p className="text-text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-text-primary hover:text-text-secondary transition-colors underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 