export function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="h-24 bg-gray-200 rounded-lg dark:bg-gray-700"></div>
        <div className="h-24 bg-gray-200 rounded-lg dark:bg-gray-700"></div>
        <div className="h-24 bg-gray-200 rounded-lg dark:bg-gray-700"></div>
        <div className="h-24 bg-gray-200 rounded-lg dark:bg-gray-700"></div>
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="h-8 w-1/3 bg-gray-200 rounded-lg dark:bg-gray-700 mb-4"></div>
          <div className="space-y-4">
            <div className="h-16 bg-gray-200 rounded-lg dark:bg-gray-700"></div>
            <div className="h-16 bg-gray-200 rounded-lg dark:bg-gray-700"></div>
            <div className="h-16 bg-gray-200 rounded-lg dark:bg-gray-700"></div>
          </div>
        </div>
      </div>
    </div>
  );
}