import { AuthProvider } from "@/components/AuthProvider";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        {children}
      </div>
    </AuthProvider>
  );
}
