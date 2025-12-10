"use client"

import { format, formatDistanceToNow, isBefore } from "date-fns";
import { 
  Plane, 
  Calendar, 
  Clock, 
  User, 
  Edit, 
  Trash2, 
  CheckCircle,
  AlertTriangle,
  Wrench,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/auth-context";

const getStatusBadge = (status) => {
  const variants = {
    'DUE': { variant: 'destructive', icon: AlertTriangle, text: 'Due Now', color: 'text-red-600' },
    'NEARING': { variant: 'secondary', icon: Clock, text: 'Nearing', color: 'text-yellow-600' },
    'POSTED': { variant: 'outline', icon: Calendar, text: 'Posted', color: 'text-blue-600' },
    'COMPLETED': { variant: 'default', icon: CheckCircle, text: 'Completed', color: 'text-green-600' },
  };

  const config = variants[status] || variants['POSTED'];
  const Icon = config.icon;

  return {
    badge: (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    ),
    color: config.color,
    icon: Icon
  };
};

const getDueDateInfo = (dueDate, dueHobbs, currentHobbs = 0) => {
  const results = [];
  
  if (dueDate) {
    const due = new Date(dueDate);
    const now = new Date();
    const isOverdue = isBefore(due, now);
    
    results.push({
      type: 'date',
      value: format(due, 'PPP'),
      relative: isOverdue 
        ? `${formatDistanceToNow(due)} overdue`
        : `Due in ${formatDistanceToNow(due)}`,
      isOverdue,
      icon: Calendar
    });
  }

  if (dueHobbs) {
    const hobbsRemaining = dueHobbs - currentHobbs;
    const isOverdue = hobbsRemaining <= 0;
    
    results.push({
      type: 'hobbs',
      value: `${dueHobbs}h`,
      relative: isOverdue 
        ? `${Math.abs(hobbsRemaining).toFixed(1)}h overdue`
        : `${hobbsRemaining.toFixed(1)}h remaining`,
      isOverdue,
      icon: Clock,
      current: `${currentHobbs}h`
    });
  }

  return results;
};

export function MaintenanceDetails({ 
  maintenance, 
  aircraft, 
  onEdit, 
  onDelete, 
  onComplete 
}) {
  const { user } = useAuth();
  
  const canEdit = user?.role === 'MAINT' || user?.role === 'ADMIN';
  const canComplete = user?.role === 'MAINT' || user?.role === 'ADMIN';
  
  const statusInfo = getStatusBadge(maintenance.status);
  const dueDateInfo = getDueDateInfo(
    maintenance.due_date, 
    maintenance.due_hobbs, 
    aircraft?.hobbs_time || 0
  );
  
  const isCompleted = maintenance.status === 'COMPLETED';
  const hasOverdue = dueDateInfo.some(info => info.isOverdue);

  return (
    <div className="space-y-6">
      <SheetHeader className="sticky top-0 bg-background pb-4 border-b">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <SheetTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              {maintenance.title}
            </SheetTitle>
            <SheetDescription>
              Maintenance details for {aircraft?.tail_number || 'Unknown Aircraft'}
            </SheetDescription>
          </div>
          {statusInfo.badge}
        </div>
      </SheetHeader>

      {/* Aircraft Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plane className="h-4 w-4" />
            Aircraft Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-lg">{aircraft?.tail_number || 'Unknown'}</div>
              <div className="text-sm text-muted-foreground">
                {aircraft?.make} {aircraft?.model} ({aircraft?.year || 'Unknown Year'})
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Current Hobbs</div>
              <div className="font-medium">{aircraft?.hobbs_time || 0}h</div>
            </div>
          </div>
          
          {aircraft?.status && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant={aircraft.status === 'OK' ? 'default' : 'destructive'}>
                {aircraft.status}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Maintenance Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Maintenance Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Maintenance Item</div>
            <div className="font-medium text-lg">{maintenance.title}</div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Status</div>
              <div className="flex items-center gap-2">
                {statusInfo.badge}
                {hasOverdue && !isCompleted && (
                  <Badge variant="destructive" className="ml-2">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Overdue
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-1">Item ID</div>
              <div className="font-medium">
                {maintenance.id.slice(-12)}
              </div>
              <div className="text-sm text-muted-foreground">
                Maintenance identifier
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Due Date Information */}
      {dueDateInfo.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Due Date Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dueDateInfo.map((info, index) => {
              const Icon = info.icon;
              return (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${info.isOverdue ? 'bg-red-100 dark:bg-red-900/20' : 'bg-blue-100 dark:bg-blue-900/20'}`}>
                      <Icon className={`h-4 w-4 ${info.isOverdue ? 'text-red-600' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <div className="font-medium">
                        {info.type === 'date' ? 'Due Date' : 'Due Hours'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {info.value}
                        {info.current && ` (Current: ${info.current})`}
                      </div>
                    </div>
                  </div>
                  <div className={`text-sm font-medium ${info.isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {info.relative}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Creator Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            Created By
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="font-medium">
                {maintenance.created_by_name || 'Unknown User'}
              </div>
              <div className="text-sm text-muted-foreground">
                Created this maintenance item
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completion Information */}
      {isCompleted && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Completion Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium">
                  Completed by {maintenance.completed_by_name || 'Unknown User'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {maintenance.completed_at 
                    ? `Completed on ${format(new Date(maintenance.completed_at), 'PPP')}`
                    : 'Completion date unknown'
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {canEdit && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Button onClick={onEdit} className="flex-1">
                <Edit className="h-4 w-4 mr-2" />
                Edit Maintenance
              </Button>
              
              {canComplete && !isCompleted && (
                <Button onClick={onComplete} variant="outline" className="flex-1">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
              )}
              
              <Button onClick={onDelete} variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
