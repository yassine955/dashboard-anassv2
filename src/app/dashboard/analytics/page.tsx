'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { financialAnalyticsService } from '@/lib/financial-analytics-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer as UIResponsiveContainer, ResponsiveGrid, FluidText, ResponsiveSpacer } from '@/components/ui/responsive-container';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Euro,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  Eye
} from 'lucide-react';
import { MonthlyFinancials } from '@/types';
import { Badge } from '@/components/ui/badge';
import { useResponsive } from '@/hooks/useResponsive';

export default function AnalyticsPage() {
  const { currentUser } = useAuth();
  const { isMobile, responsive } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [monthlyData, setMonthlyData] = useState<MonthlyFinancials[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearlyComparison, setYearlyComparison] = useState<any[]>([]);
  const [showDetailedView, setShowDetailedView] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    loadAnalyticsData();
  }, [currentUser, selectedYear]);

  const loadAnalyticsData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const currentYear = new Date().getFullYear();

      // Load data for selected year and get yearly comparison
      const [yearlyData, summary] = await Promise.all([
        financialAnalyticsService.getYearlyFinancials(currentUser.uid, selectedYear),
        financialAnalyticsService.getFinancialSummary(currentUser.uid)
      ]);

      // Load yearly comparison data for past 5 years
      const yearlyPromises = [];
      for (let year = currentYear; year >= currentYear - 4; year--) {
        yearlyPromises.push(
          financialAnalyticsService.getYearlyFinancials(currentUser.uid, year)
        );
      }

      const allYearlyData = await Promise.all(yearlyPromises);
      const yearComparison = allYearlyData.map((data, index) => {
        const year = currentYear - index;
        const totals = data.reduce(
          (acc, month) => ({
            totalOmzet: acc.totalOmzet + month.omzet,
            totalKosten: acc.totalKosten + month.kosten,
            totalWinst: acc.totalWinst + month.winst
          }),
          { totalOmzet: 0, totalKosten: 0, totalWinst: 0 }
        );
        return {
          year,
          ...totals,
          months: data
        };
      });

      setMonthlyData(yearlyData);
      setFinancialSummary(summary);
      setYearlyComparison(yearComparison);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateAnalytics = async () => {
    if (!currentUser) return;

    try {
      setCalculating(true);
      console.log('Starting full financial analytics recalculation...');
      await financialAnalyticsService.recalculateAllFinancials(currentUser.uid);
      await loadAnalyticsData();
      console.log('Full financial analytics recalculation completed');
    } catch (error) {
      console.error('Error recalculating analytics:', error);
    } finally {
      setCalculating(false);
    }
  };

  // Prepare chart data
  const chartData = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const monthData = monthlyData.find(m => m.month === month);

    return {
      month: financialAnalyticsService.getMonthName(month, 'nl').substring(0, 3),
      omzet: monthData?.omzet || 0,
      kosten: monthData?.kosten || 0,
      winst: monthData?.winst || 0,
      fullMonth: financialAnalyticsService.getMonthName(month, 'nl')
    };
  });

  const pieData = monthlyData.reduce((acc, month) => {
    acc.push({
      name: 'Omzet',
      value: acc.find(item => item.name === 'Omzet')?.value || 0 + month.omzet
    });
    acc.push({
      name: 'Kosten',
      value: acc.find(item => item.name === 'Kosten')?.value || 0 + month.kosten
    });
    return acc;
  }, [] as { name: string; value: number }[]);

  const totalYearData = monthlyData.reduce(
    (acc, month) => ({
      totalOmzet: acc.totalOmzet + month.omzet,
      totalKosten: acc.totalKosten + month.kosten,
      totalWinst: acc.totalWinst + month.winst
    }),
    { totalOmzet: 0, totalKosten: 0, totalWinst: 0 }
  );

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  };

  if (loading) {
    return (
      <UIResponsiveContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </UIResponsiveContainer>
    );
  }

  return (
    <UIResponsiveContainer>
      <div className="space-y-6 sm:space-y-8">
        {/* Enhanced Header with better mobile layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
            <div className="min-w-0">
              <FluidText variant="h1" as="h1" className="text-gray-900">
                Financiële Analytics
              </FluidText>
              <FluidText variant="body" className="text-gray-600 mt-1 sm:mt-2">
                Inzicht in je omzet, kosten en winst per maand
              </FluidText>
            </div>
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 sm:items-center shrink-0">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border rounded-md text-sm sm:text-base min-w-0 touch-manipulation"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <Button
                onClick={handleRecalculateAnalytics}
                disabled={calculating}
                className="touch-manipulation active:scale-95 transition-transform text-xs sm:text-sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{calculating ? 'Herberekenen...' : 'Alle Data Herberekenen'}</span>
                <span className="sm:hidden">{calculating ? 'Bezig...' : 'Herberekenen'}</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Summary Cards with responsive grid */}
        {financialSummary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 4 }} gap="md">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                    Huidige Maand Omzet
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 truncate">
                    {formatCurrency(financialSummary.currentMonth?.omzet || 0)}
                  </div>
                  {financialSummary.trends.omzetGrowth !== 0 && (
                    <div className={`flex items-center text-xs sm:text-sm mt-1 ${financialSummary.trends.omzetGrowth > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {financialSummary.trends.omzetGrowth > 0 ?
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 shrink-0" /> :
                        <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1 shrink-0" />
                      }
                      <span className="truncate">
                        {formatPercentage(Math.abs(financialSummary.trends.omzetGrowth))} vs vorige maand
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                    Huidige Maand Kosten
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 truncate">
                    {formatCurrency(financialSummary.currentMonth?.kosten || 0)}
                  </div>
                  {financialSummary.trends.kostenGrowth !== 0 && (
                    <div className={`flex items-center text-xs sm:text-sm mt-1 ${financialSummary.trends.kostenGrowth > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                      {financialSummary.trends.kostenGrowth > 0 ?
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 shrink-0" /> :
                        <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1 shrink-0" />
                      }
                      <span className="truncate">
                        {formatPercentage(Math.abs(financialSummary.trends.kostenGrowth))} vs vorige maand
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                    Huidige Maand Winst
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className={`text-lg sm:text-xl lg:text-2xl font-bold truncate ${(financialSummary.currentMonth?.winst || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {formatCurrency(financialSummary.currentMonth?.winst || 0)}
                  </div>
                  {financialSummary.trends.winstGrowth !== 0 && (
                    <div className={`flex items-center text-xs sm:text-sm mt-1 ${financialSummary.trends.winstGrowth > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {financialSummary.trends.winstGrowth > 0 ?
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 shrink-0" /> :
                        <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1 shrink-0" />
                      }
                      <span className="truncate">
                        {formatPercentage(Math.abs(financialSummary.trends.winstGrowth))} vs vorige maand
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                    Jaar Totaal Winst
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className={`text-lg sm:text-xl lg:text-2xl font-bold truncate ${financialSummary.yearToDate.totalWinst >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {formatCurrency(financialSummary.yearToDate.totalWinst)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 mt-1 truncate">
                    Omzet: {formatCurrency(financialSummary.yearToDate.totalOmzet)}
                  </div>
                </CardContent>
              </Card>
            </ResponsiveGrid>
        </motion.div>
      )}

        {/* Enhanced Monthly Bar Chart with mobile optimization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base lg:text-lg">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <span className="truncate">
                  <span className="hidden sm:inline">Maandelijkse Omzet, Kosten & Winst ({selectedYear})</span>
                  <span className="sm:hidden">Maandelijks Overzicht {selectedYear}</span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 sm:h-80 lg:h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{
                      top: 10,
                      right: isMobile ? 5 : 30,
                      left: isMobile ? 5 : 20,
                      bottom: 5
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="month"
                      fontSize={responsive.fontSize(12, 10)}
                      tick={{ fontSize: responsive.fontSize(12, 10) }}
                    />
                    <YAxis
                      tickFormatter={formatCurrency}
                      fontSize={responsive.fontSize(12, 10)}
                      width={isMobile ? 50 : 80}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => {
                        const monthData = chartData.find(d => d.month === label);
                        return monthData?.fullMonth || label;
                      }}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: isMobile ? '12px' : '14px'
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: isMobile ? '12px' : '14px' }}
                    />
                    <Bar dataKey="omzet" fill="#22C55E" name="Omzet" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="kosten" fill="#EF4444" name="Kosten" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="winst" fill="#3B82F6" name="Winst" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      {/* Line Chart for Trends */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trends Analyse ({selectedYear})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => {
                      const monthData = chartData.find(d => d.month === label);
                      return monthData?.fullMonth || label;
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="omzet"
                    stroke="#22C55E"
                    strokeWidth={3}
                    name="Omzet"
                    dot={{ fill: '#22C55E', strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="kosten"
                    stroke="#EF4444"
                    strokeWidth={3}
                    name="Kosten"
                    dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="winst"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    name="Winst"
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

        {/* Enhanced Year Summary with responsive layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <ResponsiveGrid cols={{ default: 1, md: 2 }} gap="md">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base lg:text-lg">
                  <Euro className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  <span className="truncate">Jaar Samenvatting {selectedYear}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm sm:text-base">Totale Omzet:</span>
                    <span className="font-bold text-green-600 text-lg sm:text-xl truncate">
                      {formatCurrency(totalYearData.totalOmzet)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm sm:text-base">Totale Kosten:</span>
                    <span className="font-bold text-red-600 text-lg sm:text-xl truncate">
                      {formatCurrency(totalYearData.totalKosten)}
                    </span>
                  </div>
                  <div className="border-t pt-3 sm:pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-900 font-medium text-sm sm:text-base">Totale Winst:</span>
                      <span className={`font-bold text-xl sm:text-2xl truncate ${totalYearData.totalWinst >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {formatCurrency(totalYearData.totalWinst)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">
                    Gemiddelde maandelijkse winst: {formatCurrency(totalYearData.totalWinst / 12)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base lg:text-lg">
                  <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  <span className="truncate">
                    <span className="hidden sm:inline">Omzet vs Kosten Verdeling</span>
                    <span className="sm:hidden">Verdeling</span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Omzet', value: totalYearData.totalOmzet },
                          { name: 'Kosten', value: totalYearData.totalKosten }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={isMobile ? 60 : 80}
                        fill="#8884d8"
                        dataKey="value"
                        label={isMobile ? false : (props: any) => `${props.name}: ${formatCurrency(props.value as number)}`}
                      >
                        {[
                          { name: 'Omzet', value: totalYearData.totalOmzet },
                          { name: 'Kosten', value: totalYearData.totalKosten }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: isMobile ? '12px' : '14px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {totalYearData.totalOmzet > 0 && (
                  <div className="mt-3 sm:mt-4 text-center text-xs sm:text-sm text-gray-600">
                    Winstmarge: {formatPercentage((totalYearData.totalWinst / totalYearData.totalOmzet) * 100)}
                  </div>
                )}
              </CardContent>
            </Card>
          </ResponsiveGrid>
      </motion.div>

      {/* Yearly Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Jaar Vergelijking (Laatste 5 Jaar)
              </CardTitle>
              <Button
                variant="outline"
                onClick={() => setShowDetailedView(!showDetailedView)}
              >
                {showDetailedView ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Minder details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Meer details
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {yearlyComparison.length > 0 ? (
              <div className="space-y-4">
                {/* Yearly Bar Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearlyComparison} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={formatCurrency} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="totalOmzet" fill="#22C55E" name="Omzet" />
                      <Bar dataKey="totalKosten" fill="#EF4444" name="Kosten" />
                      <Bar dataKey="totalWinst" fill="#3B82F6" name="Winst" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Detailed Year Cards */}
                {showDetailedView && (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {yearlyComparison.map((yearData) => (
                      <Card key={yearData.year} className={`${yearData.year === new Date().getFullYear() ? 'ring-2 ring-blue-500' : ''
                        }`}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex justify-between items-center">
                            <span>{yearData.year}</span>
                            {yearData.year === new Date().getFullYear() && (
                              <Badge className="bg-blue-100 text-blue-800">Huidig</Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Omzet:</span>
                              <span className="font-semibold text-green-600">
                                {formatCurrency(yearData.totalOmzet)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Kosten:</span>
                              <span className="font-semibold text-red-600">
                                {formatCurrency(yearData.totalKosten)}
                              </span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                              <span className="text-sm font-medium">Winst:</span>
                              <span className={`font-bold ${yearData.totalWinst >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {formatCurrency(yearData.totalWinst)}
                              </span>
                            </div>
                            {yearData.totalOmzet > 0 && (
                              <div className="text-center text-xs text-gray-500">
                                Marge: {formatPercentage((yearData.totalWinst / yearData.totalOmzet) * 100)}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Beste Jaar (Omzet)</p>
                    <p className="text-lg font-bold text-green-600">
                      {yearlyComparison.reduce((best, year) =>
                        year.totalOmzet > best.totalOmzet ? year : best
                      ).year}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(Math.max(...yearlyComparison.map(y => y.totalOmzet)))}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Beste Jaar (Winst)</p>
                    <p className="text-lg font-bold text-blue-600">
                      {yearlyComparison.reduce((best, year) =>
                        year.totalWinst > best.totalWinst ? year : best
                      ).year}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(Math.max(...yearlyComparison.map(y => y.totalWinst)))}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Gemiddelde Jaarwinst</p>
                    <p className={`text-lg font-bold ${(yearlyComparison.reduce((sum, year) => sum + year.totalWinst, 0) / yearlyComparison.length) >= 0 ?
                        'text-green-600' : 'text-red-600'
                      }`}>
                      {formatCurrency(yearlyComparison.reduce((sum, year) => sum + year.totalWinst, 0) / yearlyComparison.length)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Geen historische data beschikbaar.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Fixed Current Year Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              2025 Overzicht (Altijd Actueel)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {financialSummary && (
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(financialSummary.yearToDate?.totalOmzet || 0)}
                  </p>
                  <p className="text-sm text-gray-600">Omzet YTD</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(financialSummary.yearToDate?.totalKosten || 0)}
                  </p>
                  <p className="text-sm text-gray-600">Kosten YTD</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <p className={`text-2xl font-bold ${(financialSummary.yearToDate?.totalWinst || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {formatCurrency(financialSummary.yearToDate?.totalWinst || 0)}
                  </p>
                  <p className="text-sm text-gray-600">Winst YTD</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(financialSummary.currentMonth?.omzet || 0)}
                  </p>
                  <p className="text-sm text-gray-600">Huidige Maand</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      </div>
    </UIResponsiveContainer>
  );
}