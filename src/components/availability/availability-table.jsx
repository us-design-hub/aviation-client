"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, User, Plane, Calendar, Clock, Eye } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/contexts/auth-context";

export function AvailabilityTable({ 
  availability = [], 
  onEdit, 
  onDelete, 
  onView,
  loading = false 
}) {
  const { user } = useAuth();
  const getTypeBadge = (type) => {
    return (
      <div className="flex items-center gap-2">
        {type === 'user' ? (
          <User className="h-4 w-4 text-blue-600" />
        ) : (
          <Plane className="h-4 w-4 text-green-600" />
        )}
        <Badge variant={type === 'user' ? 'destructive' : 'secondary'}>
          {type === 'user' ? 'User Unavailable' : 'Aircraft Maintenance'}
        </Badge>
      </div>
    );
  };

  const getResourceName = (item) => {
    if (item.type === 'user') {
      // Use the user_name field that's already provided by the server
      return item.user_name || `User ${item.user_id}`;
    } else {
      // Use the aircraft_tail field that's already provided by the server
      return item.aircraft_tail || `Aircraft ${item.aircraft_id}`;
    }
  };

  const formatTimeRange = (item) => {
    if (!item.start_time || !item.end_time) {
      return <span className="text-muted-foreground">All day</span>;
    }
    return (
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        {item.start_time} - {item.end_time}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Availability ({availability.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (availability.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Availability (0)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No availability records found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Availability ({availability.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Recurring</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {availability
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) // Most recent first
                .map((item) => (
                  <TableRow 
                    key={item.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onView?.(item)}
                  >
                    <TableCell>
                      {getTypeBadge(item.type)}
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-medium">
                        {getResourceName(item)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {item.start_date ? format(parseISO(item.start_date.split('T')[0]), "MMM d, yyyy") : "No date"}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {item.end_date ? format(parseISO(item.end_date.split('T')[0]), "MMM d, yyyy") : "No date"}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {formatTimeRange(item)}
                    </TableCell>
                    
                    <TableCell>
                      {item.recurring ? (
                        <Badge variant="outline">
                          {item.recurring_type}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {item.reason ? (
                        <div className="max-w-[200px] truncate" title={item.reason}>
                          {item.reason}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {format(parseISO(item.created_at), "MMM d")}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView?.(item); }}>
                            <Eye className="mr-2 h-4 w-4" />
                            View details
                          </DropdownMenuItem>
                          
                          {/* RBAC: Only ADMIN or owner can edit/delete */}
                          {(user?.role === 'ADMIN' || user?.id === item.user_id) && (
                            <>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(item); }}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => { e.stopPropagation(); onDelete?.(item); }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
