export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-500">Kin Delivery</h1>
          <p className="text-surface-600 mt-2">Restaurant Portal</p>
        </div>
        {children}
      </div>
    </div>
  );
}
