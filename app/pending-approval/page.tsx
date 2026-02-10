'use client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  account_status: string;
  organization_id?: string;
  class_id?: string;
  student_id?: string;
  created_at: string;
  organization_name?: string;
  class_name?: string;
  class_code?: string;
}

export default function PendingApprovalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    // Fetch user data to check status
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          
          // If approved, redirect to dashboard
          if (data.account_status === "approved") {
            router.push("/");
            return;
          }
          
          // If rejected, redirect to rejection page
          if (data.account_status === "rejected") {
            router.push("/account-rejected");
            return;
          }
          
          setUserData(data);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [session, status, router]);

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-linear-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getApproverInfo = () => {
    if (!userData) return "an administrator";
    
    if (userData.role === "teacher") {
      return "an administrator";
    }
    
    if (userData.role === "student" && userData.class_name) {
      return `your class teacher or an administrator`;
    }
    
    return "an administrator";
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-8 md:p-12 border border-gray-200">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-orange-600 animate-pulse"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-4">
          Account Pending Approval
        </h1>

        {/* Message */}
        <p className="text-center text-gray-600 mb-8">
          Thank you for creating your account! Your registration is currently awaiting approval from {getApproverInfo()}.
        </p>

        {/* User Info Card */}
        {userData && (
          <div className="bg-blue-50 rounded-xl p-6 mb-8 border border-blue-200">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase">Account Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-semibold text-gray-900">{userData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-semibold text-gray-900">{userData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Role:</span>
                <span className="font-semibold text-gray-900 capitalize">{userData.role}</span>
              </div>
              {userData.organization_name && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Organization:</span>
                  <span className="font-semibold text-gray-900">{userData.organization_name}</span>
                </div>
              )}
              {userData.class_name && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Class:</span>
                  <span className="font-semibold text-gray-900">
                    {userData.class_name} ({userData.class_code})
                  </span>
                </div>
              )}
              {userData.student_id && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Student ID:</span>
                  <span className="font-semibold text-gray-900">{userData.student_id}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Registered:</span>
                <span className="font-semibold text-gray-900">
                  {new Date(userData.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-r">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>What happens next?</strong>
                <br />
                {userData?.role === "teacher" && (
                  <>An administrator will review your teacher account request. You will receive an email notification once your account is approved.</>
                )}
                {userData?.role === "student" && userData?.class_name && (
                  <>Your class teacher or an administrator will review your request. You will receive an email notification once your account is approved.</>
                )}
                {!userData?.class_name && userData?.role === "student" && (
                  <>An administrator will review your account request. You will receive an email notification once your account is approved.</>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => router.push("/auth/signout")}
            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Sign Out
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Check Status
          </button>
        </div>

        {/* Support Link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Having issues?{" "}
          <a href="mailto:support@bitbybit.edu" className="text-blue-600 hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}
