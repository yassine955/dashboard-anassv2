"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "./card"
import { Badge } from "./badge"

interface ResponsiveTableColumn {
  key: string
  label: string
  hideOnMobile?: boolean
  priority?: number // 1 = most important, higher numbers = less important
  render?: (value: any, item: any) => React.ReactNode
}

interface ResponsiveTableProps {
  columns: ResponsiveTableColumn[]
  data: any[]
  keyField?: string
  onRowClick?: (item: any) => void
  mobileCardComponent?: (item: any, index: number) => React.ReactNode
  className?: string
  emptyMessage?: string
}

const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  columns,
  data,
  keyField = 'id',
  onRowClick,
  mobileCardComponent,
  className,
  emptyMessage = "Geen gegevens beschikbaar"
}) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  // Default mobile card if not provided
  const DefaultMobileCard = ({ item, index }: { item: any; index: number }) => (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow",
        onRowClick && "cursor-pointer hover:bg-gray-50"
      )}
      onClick={() => onRowClick?.(item)}
    >
      <CardContent className="p-4">
        <div className="space-y-2">
          {columns
            .filter(col => !col.hideOnMobile)
            .sort((a, b) => (a.priority || 1) - (b.priority || 1))
            .map(column => {
              const value = item[column.key]
              const displayValue = column.render ? column.render(value, item) : value

              return (
                <div key={column.key} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">{column.label}:</span>
                  <span className="text-sm text-right">{displayValue}</span>
                </div>
              )
            })}
        </div>
      </CardContent>
    </Card>
  )

  const MobileCardComponent = mobileCardComponent || DefaultMobileCard

  return (
    <>
      {/* Desktop table */}
      <div className="hidden lg:block">
        <div className="relative w-full overflow-auto">
          <table className={cn("w-full caption-bottom text-sm", className)}>
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                {columns.map(column => (
                  <th
                    key={column.key}
                    className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {data.map((item, index) => (
                <tr
                  key={item[keyField] || index}
                  className={cn(
                    "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map(column => {
                    const value = item[column.key]
                    const displayValue = column.render ? column.render(value, item) : value

                    return (
                      <td
                        key={column.key}
                        className="p-4 align-middle [&:has([role=checkbox])]:pr-0"
                      >
                        {displayValue}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tablet table (simplified) */}
      <div className="hidden sm:block lg:hidden">
        <div className="relative w-full overflow-auto">
          <table className={cn("w-full caption-bottom text-sm", className)}>
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                {columns
                  .filter(col => !col.hideOnMobile)
                  .sort((a, b) => (a.priority || 1) - (b.priority || 1))
                  .slice(0, 4) // Limit to 4 most important columns
                  .map(column => (
                    <th
                      key={column.key}
                      className="h-12 px-3 text-left align-middle font-medium text-muted-foreground text-xs"
                    >
                      {column.label}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {data.map((item, index) => (
                <tr
                  key={item[keyField] || index}
                  className={cn(
                    "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns
                    .filter(col => !col.hideOnMobile)
                    .sort((a, b) => (a.priority || 1) - (b.priority || 1))
                    .slice(0, 4)
                    .map(column => {
                      const value = item[column.key]
                      const displayValue = column.render ? column.render(value, item) : value

                      return (
                        <td
                          key={column.key}
                          className="p-3 align-middle text-xs"
                        >
                          {displayValue}
                        </td>
                      )
                    })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="block sm:hidden space-y-3">
        {data.map((item, index) => (
          <MobileCardComponent key={item[keyField] || index} item={item} index={index} />
        ))}
      </div>
    </>
  )
}

export { ResponsiveTable, type ResponsiveTableColumn }