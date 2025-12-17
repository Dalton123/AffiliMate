export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and project settings.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-background divide-y divide-border">
        <div className="p-6">
          <h3 className="font-medium mb-1">Project Name</h3>
          <p className="text-sm text-muted-foreground mb-4">
            This is the name of your AffiliMate project.
          </p>
          <input
            type="text"
            defaultValue="My Project"
            className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="p-6">
          <h3 className="font-medium mb-1">Project Slug</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Used in API URLs and unique identifiers.
          </p>
          <input
            type="text"
            defaultValue="my-project"
            className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="p-6">
          <h3 className="font-medium mb-1 text-destructive">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete your project and all associated data.
          </p>
          <button className="inline-flex items-center gap-2 rounded-md border border-destructive text-destructive px-4 py-2 text-sm font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors">
            Delete Project
          </button>
        </div>
      </div>
    </div>
  );
}
