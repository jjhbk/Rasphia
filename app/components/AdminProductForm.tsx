"use client";

import React, { useState } from "react";
import { Product } from "../types";

// ============================================================================
// REUSABLE CHIP INPUT
// ============================================================================
function ChipInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      if (!values.includes(input.trim())) {
        onChange([...values, input.trim()]);
      }
      setInput("");
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-stone-600">
        {label}
      </label>

      <div className="flex flex-wrap gap-2 p-2 border rounded-md border-stone-300">
        {values.map((item) => (
          <span
            key={item}
            className="px-2 py-1 text-xs rounded-md bg-stone-200 text-stone-800 flex items-center gap-1"
          >
            {item}
            <button
              className="text-red-600 font-bold"
              onClick={() => onChange(values.filter((x) => x !== item))}
            >
              ×
            </button>
          </span>
        ))}

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className="flex-1 min-w-[100px] bg-transparent text-sm outline-none"
        />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
interface AdminProductFormProps {
  product?: Product | null;
  onSave: (product: Product) => Promise<void> | void;
  onCancel: () => void;
}

export default function AdminProductForm({
  product,
  onSave,
  onCancel,
}: AdminProductFormProps) {
  // Strongly initialized attributes to avoid TypeScript “never” errors
  const initialAttributes: NonNullable<Product["attributes"]> = {
    skinType: product?.attributes?.skinType || [],
    concerns: product?.attributes?.concerns || [],
    comedogenicRating: product?.attributes?.comedogenicRating,
    actives: product?.attributes?.actives || [],

    hairType: product?.attributes?.hairType || [],
    hairConcerns: product?.attributes?.hairConcerns || [],
    ingredients: product?.attributes?.ingredients || [],

    physiqueGoals: product?.attributes?.physiqueGoals || [],
    usageTime: product?.attributes?.usageTime || "",

    fit: product?.attributes?.fit || [],
    silhouette: product?.attributes?.silhouette || [],

    aesthetic: product?.attributes?.aesthetic || [],
    room: product?.attributes?.room || [],

    occasion: product?.attributes?.occasion || [],
    recipient: product?.attributes?.recipient || "",

    scentNotes: product?.attributes?.scentNotes || [],
    projection: product?.attributes?.projection || "",
    longevity: product?.attributes?.longevity || "",

    useCases: product?.attributes?.useCases || [],
  };

  const [formData, setFormData] = useState<Product>({
    _id: product?._id || "",
    name: product?.name || "",
    description: product?.description || "",
    category: product?.category || "",
    brand: product?.brand || "",
    price: product?.price || 0,
    stockQuantity: product?.stockQuantity ?? 0,
    isAvailable: (product?.stockQuantity ?? 0) > 0,
    story: product?.story || "",
    imageUrl: product?.imageUrl || "",
    affiliateLink: product?.affiliateLink || "",

    tags: product?.tags || [],
    occasion: product?.occasion || [],
    recipient: product?.recipient || "",

    styleTags: product?.styleTags || [],
    colorPalette: product?.colorPalette || [],
    materials: product?.materials || [],

    attributes: initialAttributes,
  });

  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState(formData.imageUrl || "");

  // ============================================================================
  // VALIDATION
  // ============================================================================
  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = "Product name is required";
    if (!formData.category.trim()) e.category = "Category is required";
    if (!formData.price || formData.price <= 0)
      e.price = "Valid price required";
    if ((formData.stockQuantity ?? 0) < 0)
      e.stockQuantity = "Stock must be 0 or more";
    if (!formData.imageUrl && !file) e.imageUrl = "Image is required";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ============================================================================
  // GENERIC INPUT HANDLER
  // ============================================================================
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((p: any) => ({
      ...p,
      [name]:
        name === "price" || name === "stockQuantity" ? Number(value) : value,
    }));
  };

  // ============================================================================
  // SAFE-TYPED ATTRIBUTE UPDATER
  // ============================================================================
  const updateAttribute = <K extends keyof NonNullable<Product["attributes"]>>(
    key: K,
    value: NonNullable<Product["attributes"]>[K]
  ) => {
    setFormData((p: any) => ({
      ...p,
      attributes: {
        ...p.attributes!,
        [key]: value,
      },
    }));
  };

  // ============================================================================
  // IMAGE UPLOAD
  // ============================================================================
  const uploadImage = async () => {
    if (!file) return formData.imageUrl;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();

      return data.url;
    } catch {
      alert("❌ Image upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  };

  // ============================================================================
  // SUBMIT
  // ============================================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const img = await uploadImage();
    if (!img) return;

    await onSave({ ...formData, imageUrl: img });

    setIsSubmitting(false);
  };

  // ============================================================================
  // UI
  // ============================================================================
  return (
    <div className="bg-stone-50 rounded-xl border border-stone-300 p-6 shadow-inner mb-6">
      <h2 className="text-2xl font-serif text-amber-900 mb-6">
        {product ? "Edit Product" : "Add New Product"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* BASIC INFO */}
        <div>
          <label className="text-sm font-medium text-stone-600">
            Product Name
          </label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded-md"
            required
          />
          {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm">Brand</label>
            <input
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded-md"
            />
          </div>

          <div>
            <label className="text-sm">Category</label>
            <input
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded-md"
              required
            />
            {errors.category && (
              <p className="text-sm text-red-600">{errors.category}</p>
            )}
          </div>

          <div>
            <label className="text-sm">Price (₹)</label>
            <input
              name="price"
              type="number"
              value={formData.price}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded-md"
              min={1}
              step="0.01"
              required
            />
            {errors.price && (
              <p className="text-sm text-red-600">{errors.price}</p>
            )}
          </div>
          <div>
            <label className="text-sm">Available Stock</label>
            <input
              name="stockQuantity"
              type="number"
              value={formData.stockQuantity ?? 0}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded-md"
              min={0}
              step="1"
              required
            />
            {errors.stockQuantity && (
              <p className="text-sm text-red-600">{errors.stockQuantity}</p>
            )}
          </div>
        </div>

        {/* TAG FIELDS */}
        <ChipInput
          label="Tags"
          values={formData.tags || []}
          onChange={(vals) => setFormData((p: any) => ({ ...p, tags: vals }))}
        />

        <ChipInput
          label="Occasion"
          values={formData.occasion || []}
          onChange={(vals) =>
            setFormData((p: any) => ({ ...p, occasion: vals }))
          }
        />

        {/* STYLE / COLOR / MATERIAL */}
        <ChipInput
          label="Style Tags"
          values={formData.styleTags || []}
          onChange={(vals) =>
            setFormData((p: any) => ({ ...p, styleTags: vals }))
          }
        />

        <ChipInput
          label="Color Palette"
          values={formData.colorPalette || []}
          onChange={(vals) =>
            setFormData((p: any) => ({ ...p, colorPalette: vals }))
          }
        />

        <ChipInput
          label="Materials"
          values={formData.materials || []}
          onChange={(vals) =>
            setFormData((p: any) => ({ ...p, materials: vals }))
          }
        />

        {/* ADVANCED ATTRIBUTES */}
        <details className="bg-white border rounded-md p-4">
          <summary className="cursor-pointer text-stone-700 font-medium">
            Advanced Attributes (Persona Metadata)
          </summary>

          <div className="mt-4 space-y-4">
            {/* SKIN */}
            <ChipInput
              label="Skin Type"
              values={formData.attributes?.skinType || []}
              onChange={(vals) => updateAttribute("skinType", vals)}
            />

            <ChipInput
              label="Skin Concerns"
              values={formData.attributes?.concerns || []}
              onChange={(vals) => updateAttribute("concerns", vals)}
            />

            {/* HAIR */}
            <ChipInput
              label="Hair Type"
              values={formData.attributes?.hairType || []}
              onChange={(vals) => updateAttribute("hairType", vals)}
            />

            <ChipInput
              label="Hair Concerns"
              values={formData.attributes?.hairConcerns || []}
              onChange={(vals) => updateAttribute("hairConcerns", vals)}
            />

            {/* FRAGRANCE */}
            <ChipInput
              label="Scent Notes"
              values={formData.attributes?.scentNotes || []}
              onChange={(vals) => updateAttribute("scentNotes", vals)}
            />

            {/* HOME */}
            <ChipInput
              label="Aesthetic"
              values={formData.attributes?.aesthetic || []}
              onChange={(vals) => updateAttribute("aesthetic", vals)}
            />

            <ChipInput
              label="Room Type"
              values={formData.attributes?.room || []}
              onChange={(vals) => updateAttribute("room", vals)}
            />

            {/* FASHION */}
            <ChipInput
              label="Fit"
              values={formData.attributes?.fit || []}
              onChange={(vals) => updateAttribute("fit", vals)}
            />

            <ChipInput
              label="Silhouette"
              values={formData.attributes?.silhouette || []}
              onChange={(vals) => updateAttribute("silhouette", vals)}
            />

            {/* BODY / WELLNESS */}
            <ChipInput
              label="Physique Goals"
              values={formData.attributes?.physiqueGoals || []}
              onChange={(vals) => updateAttribute("physiqueGoals", vals)}
            />

            {/* GENERAL / CROSS-CATEGORY */}
            <ChipInput
              label="Use Cases"
              values={formData.attributes?.useCases || []}
              onChange={(vals) => updateAttribute("useCases", vals)}
            />
          </div>
        </details>

        {/* STORY */}
        <div>
          <label className="text-sm">Story</label>
          <textarea
            name="story"
            value={formData.story}
            onChange={handleChange}
            rows={3}
            className="w-full border px-3 py-2 rounded-md"
          />
        </div>

        {/* IMAGE UPLOAD */}
        <div>
          <label className="text-sm font-medium">Upload Image</label>
          <input
            type="file"
            accept="image/*"
            required={!imagePreview}
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFile(f);
              f && setImagePreview(URL.createObjectURL(f));
            }}
          />
          {errors.imageUrl && (
            <p className="text-sm text-red-600">{errors.imageUrl}</p>
          )}

          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview"
              className="mt-3 w-40 h-40 rounded-md object-cover border"
            />
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded-md"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting || uploading}
            className="px-4 py-2 bg-stone-800 text-white rounded-md disabled:bg-stone-500"
          >
            {isSubmitting ? "Saving…" : "Save Product"}
          </button>
        </div>
      </form>
    </div>
  );
}
