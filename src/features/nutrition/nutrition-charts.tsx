"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from "recharts";

type NutritionChartsProps = {
  categoryData: Array<{ name: string; value: number }>;
  locationData: Array<{ name: string; value: number }>;
};

const colors = ["#f97316", "#22c55e", "#0ea5e9", "#f59e0b", "#ef4444", "#a855f7", "#14b8a6"];

export function NutritionCharts({ categoryData, locationData }: NutritionChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="h-72 rounded-xl border bg-card p-4">
        <h3 className="mb-3 text-sm font-medium">Inventory by Category</h3>
        {categoryData.length === 0 ? (
          <div className="flex h-[calc(100%-1.5rem)] items-center justify-center text-center text-sm text-muted-foreground">
            No category data yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95}>
                {categoryData.map((entry, index) => (
                  <Cell key={entry.name} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="h-72 rounded-xl border bg-card p-4">
        <h3 className="mb-3 text-sm font-medium">Inventory by Storage Location</h3>
        {locationData.length === 0 ? (
          <div className="flex h-[calc(100%-1.5rem)] items-center justify-center text-center text-sm text-muted-foreground">
            No storage data yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={locationData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#f97316" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
