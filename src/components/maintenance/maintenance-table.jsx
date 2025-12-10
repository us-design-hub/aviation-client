"use client"

import { useState } from "react";
import { formatDistanceToNow, format, isAfter, isBefore, addDays } from "date-fns";
import { MoreHorizontal, Edit, Trash2, CheckCircle, Plane, Clock, AlertTriangle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";

const getStatusBadge = (status) => {
  const variants = {
    'DUE': { variant: 'destructive', icon: AlertTriangle, text: 'Due Now' },
    'NEARING': { variant: 'secondary', icon: Clock, text: 'Nearing' },
    'POSTED': { variant: 'outline', icon: Calendar, text: 'Posted' },
    'COMPLETED': { variant: 'default', icon: CheckCircle, text: 'Completed' },
  };

  const config = variants[status] || variants['POSTED'];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.text}
    </Badge>
  );
};

const getDueDateInfo = (dueDate, dueHobbs, currentHobbs = 0) => {
  if (!dueDate && !dueHobbs) return null;

  const now = new Date();
  let isOverdue = false;
  let timeInfo = '';

  if (dueDate) {
    const due = new Date(dueDate);
    isOverdue = isBefore(due, now);
    timeInfo = isOverdue 
      ? `${formatDistanceToNow(due)} overdue`
      : `Due ${formatDistanceToNow(due)}`;
  }

  if (dueHobbs) {
    const hobbsRemaining = dueHobbs - currentHobbs;
    const hobbsInfo = hobbsRemaining <= 0 
      ? `${Math.abs(hobbsRemaining).toFixed(1)}h overdue`
      : `${hobbsRemaining.toFixed(1)}h remaining`;
    
    timeInfo = timeInfo ? `${timeInfo}, ${hobbsInfo}` : hobbsInfo;
  }

  return {
    text: timeInfo,
    isOverdue: isOverdue || (dueHobbs && dueHobbs <= currentHobbs),
  };
};

export function MaintenanceTable({
  maintenance,
  aircraft,
  onMaintenanceClick,
  onEditMaintenance,
  onDeleteMaintenance,
  onCompleteMaintenance,
}) {
  const { user } = useAuth();
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const canEdit = user?.role === 'MAINT' || user?.role === 'ADMIN';
  const canComplete = user?.role === 'MAINT' || user?.role === 'ADMIN';

  // Sort maintenance items
  const sortedMaintenance = [...maintenance].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Handle date sorting
    if (sortConfig.key === 'due_date') {
      aValue = aValue ? new Date(aValue) : new Date('9999-12-31');
      bValue = bValue ? new Date(bValue) : new Date('9999-12-31');
    }

    // Handle string sorting
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  if (maintenance.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Plane className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="text-xl mb-2">No Maintenance Items</CardTitle>
          <CardDescription className="text-center">
            No maintenance items found matching your filters.
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance Items ({maintenance.length})</CardTitle>
        <CardDescription>
          Manage aircraft maintenance schedules and track completion status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('tail_number')}
                >
                  Aircraft
                  {sortConfig.key === 'tail_number' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('title')}
                >
                  Maintenance Item
                  {sortConfig.key === 'title' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('status')}
                >
                  Status
                  {sortConfig.key === 'status' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('due_date')}
                >
                  Due Date
                  {sortConfig.key === 'due_date' && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </TableHead>
                <TableHead>Due Hours</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMaintenance.map((item) => {
                const aircraftInfo = aircraft.find(ac => ac.id === item.aircraft_id);
                const dueDateInfo = getDueDateInfo(item.due_date, item.due_hobbs, aircraftInfo?.hobbs_time || 0);
                
                return (
                  <TableRow 
                    key={item.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onMaintenanceClick(item)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{item.tail_number || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">
                            {aircraftInfo?.make} {aircraftInfo?.model}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {item.id.slice(-8)}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(item.status)}
                    </TableCell>
                    
                    <TableCell>
                      {item.due_date ? (
                        <div>
                          <div className="font-medium">
                            {format(new Date(item.due_date), 'MMM d, yyyy')}
                          </div>
                          {dueDateInfo && (
                            <div className={`text-sm ${dueDateInfo.isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                              {dueDateInfo.text}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {item.due_hobbs ? (
                        <div>
                          <div className="font-medium">{item.due_hobbs}h</div>
                          <div className="text-sm text-muted-foreground">
                            Current: {aircraftInfo?.hobbs_time || 0}h
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {item.created_by_name || 'Unknown'}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canEdit && (
                            <>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditMaintenance(item);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          
                          {canComplete && item.status !== 'COMPLETED' && (
                            <>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCompleteMaintenance(item);
                                }}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark Complete
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          
                          {canEdit && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteMaintenance(item);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
