"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Star, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Deal } from "@/hooks/use-deals";

interface ColumnCallbacks {
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
  onToggleFeatured: (deal: Deal) => void;
  onToggleActive: (deal: Deal) => void;
}

export function getColumns(callbacks: ColumnCallbacks): ColumnDef<Deal>[] {
  return [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => {
        const deal = row.original;
        return (
          <div className="max-w-[300px]">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{deal.title}</span>
              {deal.is_featured && (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              )}
            </div>
            {deal.awin_advertiser_name && (
              <p className="text-sm text-muted-foreground truncate">
                {deal.awin_advertiser_name}
              </p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "voucher_code",
      header: "Code",
      cell: ({ row }) => {
        const code = row.original.voucher_code;
        if (!code) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <code className="rounded bg-muted px-2 py-1 text-sm">{code}</code>
        );
      },
    },
    {
      accessorKey: "regions",
      header: "Regions",
      cell: ({ row }) => {
        const regions = row.original.regions;
        if (!regions || regions.length === 0) {
          return <span className="text-muted-foreground">All</span>;
        }
        const display = regions.slice(0, 3).join(", ");
        const more = regions.length > 3 ? ` +${regions.length - 3}` : "";
        return <span className="text-sm">{display}{more}</span>;
      },
    },
    {
      accessorKey: "synced_from_awin",
      header: "Source",
      cell: ({ row }) => {
        const isAwin = row.original.synced_from_awin;
        return (
          <Badge variant={isAwin ? "default" : "secondary"}>
            {isAwin ? "Awin" : "Manual"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        const endDate = row.original.end_date;
        const isExpired = endDate && new Date(endDate) < new Date();

        if (isExpired) {
          return <Badge variant="destructive">Expired</Badge>;
        }
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const deal = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => callbacks.onEdit(deal)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open(deal.tracking_url, "_blank")}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => callbacks.onToggleFeatured(deal)}>
                <Star className="mr-2 h-4 w-4" />
                {deal.is_featured ? "Unfeature" : "Feature"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => callbacks.onToggleActive(deal)}>
                {deal.is_active ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => callbacks.onDelete(deal)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
