"use client"

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { MoreHorizontal, AlertTriangle, CheckCircle, Clock, Plane, User, Calendar, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";

export function SquawksTable({ 
  squawks, 
  aircraft, 
  onSquawkClick, 
  onEditSquawk,
  onDeleteSquawk,
  onResolveSquawk 
}) {
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  // Sort squawks
  const sortedSquawks = [...squawks].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    // Handle date sorting
    if (sortBy === "created_at" || sortBy === "resolved_at") {
      aValue = new Date(aValue || 0);
      bValue = new Date(bValue || 0);
    }

    // Handle string sorting
    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // RBAC permissions
  const canEdit = user?.role === 'MAINT' || user?.role === 'ADMIN';
  const canResolve = user?.role === 'MAINT' || user?.role === 'ADMIN';

  const getStatusBadge = (status) => {
    const variants = {
      'OPEN': { variant: 'destructive', icon: AlertTriangle, text: 'Open' },
      'RESOLVED': { variant: 'default', icon: CheckCircle, text: 'Resolved' },
    };

    const config = variants[status] || variants['OPEN'];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  if (squawks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="text-xl mb-2">No Squawks</CardTitle>
          <CardDescription className="text-center">
            No squawk reports found matching your filters.
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Squawk Reports ({squawks.length})</CardTitle>
        <CardDescription>
          Track and resolve aircraft maintenance issues and discrepancies
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("tail_number")}
                >
                  Aircraft
                  {sortBy === "tail_number" && (
                    <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("description")}
                >
                  Issue Description
                  {sortBy === "description" && (
                    <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("status")}
                >
                  Status
                  {sortBy === "status" && (
                    <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("reported_by_name")}
                >
                  Reported By
                  {sortBy === "reported_by_name" && (
                    <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("created_at")}
                >
                  Reported Date
                  {sortBy === "created_at" && (
                    <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                  )}
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSquawks.map((squawk) => {
                const aircraftInfo = aircraft.find(ac => ac.id === squawk.aircraft_id);
                
                return (
                  <TableRow 
                    key={squawk.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onSquawkClick(squawk)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{squawk.tail_number || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">
                            {aircraftInfo?.make} {aircraftInfo?.model}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="max-w-[300px]">
                      <div>
                        <div className="font-medium truncate">{squawk.description}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {squawk.id.slice(-8)}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(squawk.status)}
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {squawk.reported_by_name || 'Unknown'}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {squawk.created_at ? (
                        <div>
                          <div className="font-medium">
                            {format(new Date(squawk.created_at), 'MMM d, yyyy')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(squawk.created_at), { addSuffix: true })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
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
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onSquawkClick(squawk);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          
                          {canEdit && (
                            <>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditSquawk && onEditSquawk(squawk);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          
                          {canResolve && squawk.status === 'OPEN' && (
                            <>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onResolveSquawk(squawk);
                                }}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark Resolved
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          
                          {canEdit && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSquawk && onDeleteSquawk(squawk);
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
