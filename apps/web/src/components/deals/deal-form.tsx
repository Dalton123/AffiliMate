"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Deal, CreateDealRequest } from "@/hooks/use-deals";

interface DealFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal | null;
  onSubmit: (data: CreateDealRequest) => Promise<void>;
  isLoading?: boolean;
}

export function DealForm({
  open,
  onOpenChange,
  deal,
  onSubmit,
  isLoading,
}: DealFormProps) {
  const isEditing = !!deal;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateDealRequest>({
    defaultValues: {
      title: "",
      description: "",
      terms: "",
      voucher_code: "",
      tracking_url: "",
      merchant_name: "",
      regions: [],
      categories: [],
      is_featured: false,
    },
  });

  // Reset form when deal changes
  useEffect(() => {
    if (deal) {
      reset({
        title: deal.title,
        description: deal.description || "",
        terms: deal.terms || "",
        voucher_code: deal.voucher_code || "",
        tracking_url: deal.tracking_url,
        merchant_name: deal.awin_advertiser_name || "",
        start_date: deal.start_date || "",
        end_date: deal.end_date || "",
        regions: deal.regions,
        categories: deal.categories,
        is_featured: deal.is_featured,
      });
    } else {
      reset({
        title: "",
        description: "",
        terms: "",
        voucher_code: "",
        tracking_url: "",
        merchant_name: "",
        regions: [],
        categories: [],
        is_featured: false,
      });
    }
  }, [deal, reset]);

  const isFeatured = watch("is_featured");

  const handleFormSubmit = async (data: CreateDealRequest) => {
    // Parse regions/categories from comma-separated strings
    const formData = {
      ...data,
      regions:
        typeof data.regions === "string"
          ? (data.regions as string).split(",").map((r) => r.trim()).filter(Boolean)
          : data.regions,
      categories:
        typeof data.categories === "string"
          ? (data.categories as string).split(",").map((c) => c.trim()).filter(Boolean)
          : data.categories,
    };

    await onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Deal" : "Create Deal"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the deal details below."
              : "Add a new manually curated deal."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., 15% off all dog food"
              {...register("title", { required: "Title is required" })}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchant_name">Merchant Name</Label>
            <Input
              id="merchant_name"
              placeholder="e.g., Pets at Home"
              {...register("merchant_name")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the deal..."
              {...register("description")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="voucher_code">Voucher Code</Label>
            <Input
              id="voucher_code"
              placeholder="e.g., SAVE15 (leave empty if auto-applied)"
              {...register("voucher_code")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tracking_url">Tracking URL *</Label>
            <Input
              id="tracking_url"
              placeholder="https://www.awin1.com/..."
              {...register("tracking_url", { required: "Tracking URL is required" })}
            />
            {errors.tracking_url && (
              <p className="text-sm text-destructive">{errors.tracking_url.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                {...register("start_date")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                {...register("end_date")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="regions">Regions</Label>
            <Input
              id="regions"
              placeholder="GB, US, DE (comma-separated ISO codes)"
              {...register("regions")}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for all regions
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categories">Categories</Label>
            <Input
              id="categories"
              placeholder="dog-food, equipment (comma-separated)"
              {...register("categories")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms">Terms & Conditions</Label>
            <Textarea
              id="terms"
              placeholder="Any restrictions or terms..."
              {...register("terms")}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_featured"
              checked={isFeatured}
              onCheckedChange={(checked) => setValue("is_featured", !!checked)}
            />
            <Label htmlFor="is_featured" className="font-normal">
              Feature this deal (shows at top)
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Deal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
