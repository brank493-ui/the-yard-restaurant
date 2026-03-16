'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserActivity } from '@/lib/services/adminService';
import { Search, Eye, ChevronLeft, ChevronRight, User, Mail, Phone, Calendar } from 'lucide-react';

interface UserActivityTableProps {
  users: UserActivity[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onSearch: (search: string) => void;
  onFilterChange: (filter: string) => void;
  onViewDetails: (user: UserActivity) => void;
  searchValue: string;
  filterValue: string;
}

const paymentStatusColors: Record<string, string> = {
  PAID: 'bg-green-500 text-white',
  PENDING: 'bg-yellow-500 text-black',
  PARTIAL: 'bg-orange-500 text-white',
};

const paymentMethodLabels: Record<string, string> = {
  CASH: '💵 Cash',
  ORANGE_MONEY: '🟠 Orange',
  MTN_MONEY: '🟡 MTN',
  VISA: '💳 Visa',
  MASTERCARD: '💳 Mastercard',
  STRIPE: '💜 Stripe',
};

export default function UserActivityTable({
  users,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onSearch,
  onFilterChange,
  onViewDetails,
  searchValue,
  filterValue,
}: UserActivityTableProps) {
  const [localSearch, setLocalSearch] = useState(searchValue);
  const totalPages = Math.ceil(total / pageSize);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
  };

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch(localSearch);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Card className="bg-stone-800 border-stone-700">
        <CardHeader>
          <CardTitle className="text-white">User Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-stone-700 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-stone-800 border-stone-700">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-white flex items-center gap-2">
            <User className="h-5 w-5 text-amber-400" />
            User Activity Today
            <span className="text-stone-400 text-sm font-normal">({total} users)</span>
          </CardTitle>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <Input
                placeholder="Search name or email..."
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchSubmit}
                className="pl-9 bg-stone-700 border-stone-600 text-white w-full sm:w-48 h-9"
              />
            </div>
            <Select value={filterValue} onValueChange={onFilterChange}>
              <SelectTrigger className="bg-stone-700 border-stone-600 text-white w-32 h-9">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent className="bg-stone-700 border-stone-600">
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-stone-700 hover:bg-stone-700/50">
                <TableHead className="text-stone-400 font-medium">User</TableHead>
                <TableHead className="text-stone-400 font-medium">Contact</TableHead>
                <TableHead className="text-stone-400 font-medium text-center">Orders</TableHead>
                <TableHead className="text-stone-400 font-medium text-center">Reservations</TableHead>
                <TableHead className="text-stone-400 font-medium text-center">Events</TableHead>
                <TableHead className="text-stone-400 font-medium text-right">Amount</TableHead>
                <TableHead className="text-stone-400 font-medium text-center">Payment</TableHead>
                <TableHead className="text-stone-400 font-medium text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-stone-400 py-12">
                    <div className="flex flex-col items-center gap-2">
                      <User className="h-12 w-12 text-stone-600" />
                      <p>No user activity found for today</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className="border-stone-700 hover:bg-stone-700/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <span className="text-amber-400 font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.name}</p>
                          <p className="text-stone-500 text-xs">{user.userId.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-stone-300 text-sm">
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-32">{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1 text-stone-400 text-xs">
                            <Phone className="h-3 w-3" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-amber-400 font-semibold">{user.orders.length}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-blue-400 font-semibold">{user.reservations.length}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-purple-400 font-semibold">{user.events.length}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-green-400 font-semibold">
                        {user.totalAmount.toLocaleString()} XAF
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Badge className={`${paymentStatusColors[user.paymentStatus]} text-xs`}>
                          {user.paymentStatus}
                        </Badge>
                        {user.paymentMethod && (
                          <span className="text-stone-500 text-xs">
                            {paymentMethodLabels[user.paymentMethod] || user.paymentMethod}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewDetails(user)}
                        className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 h-8"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-stone-700">
            <p className="text-stone-400 text-sm">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} users
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
                className="border-stone-600 text-stone-300 hover:bg-stone-700 h-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-stone-400 text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
                className="border-stone-600 text-stone-300 hover:bg-stone-700 h-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
