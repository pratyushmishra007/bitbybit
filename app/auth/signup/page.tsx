"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic';

type SignupType = "individual" | "institutional" | "teacher" | null;

interface OrganizationData {
  id: string;
  name: string;
  type: string;
  code: string;
}

interface ClassData {
  id: string;
  name: string;
  code: string;
  year_level: number;
  description: string;
  department: { id: string; name: string; code: string } | null;
  semester: { id: string; name: string; semester_number: number } | null;
}

export default function SignUpPage() {
  const router = useRouter();
  const [signupType, setSignupType] = useState<SignupType>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form data
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [organizationCode, setOrganizationCode] = useState("");
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [studentId, setStudentId] = useState("");

  // Validation states
  const [emailError, setEmailError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong" | "">("");

  const handleSignupTypeSelect = (type: SignupType) => {
    setSignupType(type);
    setStep(2);
    setError("");
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("");
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const calculatePasswordStrength = (pwd: string) => {
    if (!pwd) {
      setPasswordStrength("");
      return;
    }
    
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    if (strength <= 2) setPasswordStrength("weak");
    else if (strength <= 3) setPasswordStrength("medium");
    else setPasswordStrength("strong");
  };

  const handleBasicInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (!validateEmail(email)) {
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (signupType === "individual") {
      // For individual learners, create account directly
      await createAccount();
    } else if (signupType === "teacher") {
      // For teachers, move to organization verification
      setStep(3);
    } else {
      // For institutional students, move to organization verification
      setStep(3);
    }
  };

  const handleOrganizationVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/auth/organizations?code=${organizationCode.toUpperCase()}`
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid organization code");
        setLoading(false);
        return;
      }

      setOrganization(data.organization);
      
      // Teachers don't need to select a class, skip to account creation
      if (signupType === "teacher") {
        await createAccount();
        return;
      }
      
      // Fetch classes for this organization (students only)
      const classesResponse = await fetch(
        `/api/auth/classes?organizationId=${data.organization.id}`
      );
      const classesData = await classesResponse.json();

      if (classesResponse.ok) {
        setClasses(classesData.classes || []);
        setStep(4);
      } else {
        setError("Failed to load classes");
      }
    } catch (error) {
      console.error("Error verifying organization:", error);
      setError("Failed to verify organization");
    } finally {
      setLoading(false);
    }
  };

  const handleClassSelection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) {
      setError("Please select a class");
      return;
    }
    setError("");
    setStep(5);
  };

  const createAccount = async () => {
    setLoading(true);
    setError("");

    try {
      // Create user in Supabase
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          signupType,
          organizationId: organization?.id || null,
          classId: selectedClassId || null,
          studentId: studentId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create account");
        setLoading(false);
        return;
      }

      // Sign in after successful signup
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but login failed. Please try logging in.");
        setLoading(false);
        return;
      }

      // Redirect to dashboard
      router.push("/");
    } catch (error) {
      console.error("Signup error:", error);
      setError("An error occurred during signup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Join BitByBit
          </h1>
          <p className="text-gray-600 mt-2">Start your coding journey today</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Step 1: Choose signup type */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              How do you want to join?
            </h2>
            <button
              onClick={() => handleSignupTypeSelect("individual")}
              className="w-full p-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-left">
                <h3 className="text-lg font-bold mb-2">Individual Learner</h3>
                <p className="text-sm text-green-50">
                  Learn at your own pace with public courses
                </p>
              </div>
            </button>
            <button
              onClick={() => handleSignupTypeSelect("institutional")}
              className="w-full p-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-left">
                <h3 className="text-lg font-bold mb-2">Student (School/College)</h3>
                <p className="text-sm text-blue-50">
                  Join with your institution code for class-based learning
                </p>
              </div>
            </button>
            <button
              onClick={() => handleSignupTypeSelect("teacher")}
              className="w-full p-6 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl transition-all transform hover:scale-105 shadow-lg"
            >
              <div className="text-left">
                <h3 className="text-lg font-bold mb-2">Teacher/Educator</h3>
                <p className="text-sm text-purple-50">
                  Create an account to teach and manage classes
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Step 2: Basic Info */}
        {step === 2 && (
          <form onSubmit={handleBasicInfoSubmit} className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Basic Information
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (e.target.value) validateEmail(e.target.value);
                }}
                onBlur={() => email && validateEmail(email)}
                className={`w-full px-4 py-3 border ${
                  emailError ? "border-red-300" : "border-gray-300"
                } rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                placeholder="you@example.com"
                required
              />
              {emailError && (
                <p className="mt-1 text-sm text-red-600">{emailError}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  calculatePasswordStrength(e.target.value);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="••••••••"
                required
                minLength={6}
              />
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    <div className={`h-1.5 flex-1 rounded-full transition-colors ${
                      passwordStrength === "weak" ? "bg-red-500" :
                      passwordStrength === "medium" ? "bg-yellow-500" :
                      passwordStrength === "strong" ? "bg-green-500" : "bg-gray-300"
                    }`} />
                    <div className={`h-1.5 flex-1 rounded-full transition-colors ${
                      passwordStrength === "medium" || passwordStrength === "strong" ? 
                      (passwordStrength === "medium" ? "bg-yellow-500" : "bg-green-500") : "bg-gray-300"
                    }`} />
                    <div className={`h-1.5 flex-1 rounded-full transition-colors ${
                      passwordStrength === "strong" ? "bg-green-500" : "bg-gray-300"
                    }`} />
                  </div>
                  <p className={`text-xs ${
                    passwordStrength === "weak" ? "text-red-600" :
                    passwordStrength === "medium" ? "text-yellow-600" :
                    "text-green-600"
                  }`}>
                    Password strength: {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                  </p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>• At least 8 characters</p>
                    <p>• Mix of uppercase & lowercase</p>
                    <p>• Include numbers and symbols</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !!emailError}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {signupType === "individual" ? "Create Account" : "Continue"}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Organization Code */}
        {step === 3 && (
          <form onSubmit={handleOrganizationVerify} className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Organization Code
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter the code provided by your school/college
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization Code
              </label>
              <input
                type="text"
                value={organizationCode}
                onChange={(e) => setOrganizationCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
                placeholder="BITBYBIT"
                required
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify"}
              </button>
            </div>
          </form>
        )}

        {/* Step 4: Class Selection */}
        {step === 4 && (
          <form onSubmit={handleClassSelection} className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Select Your Class
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {organization?.name}
            </p>
            
            {classes.length === 0 ? (
              <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-800 font-medium mb-2">⚠️ No Classes Available</p>
                <p className="text-sm text-amber-700 mb-4">
                  There are currently no classes set up for your organization. 
                  Please contact your institution's administrator to create classes first.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStep(3);
                    setOrganization(null);
                    setClasses([]);
                  }}
                  className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                >
                  Try Different Organization
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class/Batch
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select your class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} {cls.year_level ? `- Year ${cls.year_level}` : ""}
                        {cls.department ? ` (${cls.department.name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(3);
                      setOrganization(null);
                      setClasses([]);
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}
          </form>
        )}

        {/* Step 5: Student ID */}
        {step === 5 && (
          <form onSubmit={(e) => { e.preventDefault(); createAccount(); }} className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Student ID
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter your roll number or student ID
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student ID / Roll Number
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g., 2024CS001"
                required
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Account"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <a href="/auth/signin" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
