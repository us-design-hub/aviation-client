import { Card, CardContent } from './card';

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        {Icon && (
          <div className="mb-4 text-muted-foreground">
            <Icon className="h-16 w-16 mx-auto" />
          </div>
        )}
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm max-w-md mb-6">
          {description}
        </p>
        {action && <div>{action}</div>}
      </CardContent>
    </Card>
  );
}

