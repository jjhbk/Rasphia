"use client";
import React, { useState } from "react";

interface Product {
  _id?: string;
  name: string;
  description: string;
  category: string;
  brand?: string;
  tags?: string[];
  occasion?: string[];
  recipient?: string;
  price: number;
  story?: string;
  imageUrl: string;
  affiliateLink?: string;
  reviews?: any[];
}

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
  const [formData, setFormData] = useState<Product>({
    _id: product?._id,
    name: product?.name || "",
    description: product?.description || "",
    category: product?.category || "",
    brand: product?.brand || "",
    tags: product?.tags || [],
    occasion: product?.occasion || [],
    recipient: product?.recipient || "",
    price: product?.price || 0,
    story: product?.story || "",
    imageUrl: product?.imageUrl || "",
    affiliateLink: product?.affiliateLink || "",
    reviews: product?.reviews || [],
  });

  const [tagInput, setTagInput] = useState("");
  const [occasionInput, setOccasionInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState(product?.imageUrl || "");

  // ✅ Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Product name is required";
    if (!formData.category.trim()) newErrors.category = "Category is required";
    if (!formData.price || formData.price <= 0)
      newErrors.price = "Valid price required";
    if (!formData.imageUrl.trim() && !file)
      newErrors.imageUrl = "Image or file required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ Generic input handler
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "price" ? parseFloat(value) || 0 : value,
    }));
  };

  // ✅ Handle image file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setImagePreview(URL.createObjectURL(selected));
    }
  };

  // ✅ Handle tag additions
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag),
    }));
  };

  // ✅ Handle occasion additions
  const handleOccasionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && occasionInput.trim()) {
      e.preventDefault();
      setFormData((prev) => ({
        ...prev,
        occasion: [...(prev.occasion || []), occasionInput.trim()],
      }));
      setOccasionInput("");
    }
  };

  const removeOccasion = (o: string) => {
    setFormData((prev) => ({
      ...prev,
      occasion: prev.occasion?.filter((x) => x !== o),
    }));
  };

  // ✅ Upload image to server
  const uploadImage = async (): Promise<string | null> => {
    if (!file) return formData.imageUrl;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        setFormData((prev) => ({ ...prev, imageUrl: data.url }));
        return data.url;
      }
      throw new Error("Upload failed");
    } catch (err) {
      console.error("Upload error:", err);
      alert("❌ Image upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  };

  // ✅ Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const url = await uploadImage();
      if (!url) return;
      await onSave({ ...formData, imageUrl: url });
    } catch (err) {
      console.error("❌ Save failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-stone-50 rounded-xl border border-stone-300 p-6 shadow-inner mb-6">
      <h2 className="text-2xl font-serif text-amber-900 mb-4">
        {product ? "Edit Product" : "Add New Product"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Name */}
        <div>
          <label className="block text-sm font-medium text-stone-600">
            Product Name
          </label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full border border-stone-300 rounded-md px-3 py-2"
            placeholder="Enter product name"
          />
          {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
        </div>

        {/* Brand */}
        <div>
          <label className="block text-sm font-medium text-stone-600">
            Brand
          </label>
          <input
            name="brand"
            value={formData.brand}
            onChange={handleChange}
            className="w-full border border-stone-300 rounded-md px-3 py-2"
            placeholder="E.g. Bombay Perfumery"
          />
        </div>

        {/* Category + Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-600">
              Category
            </label>
            <input
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full border border-stone-300 rounded-md px-3 py-2"
              placeholder="E.g. Perfume, Gift, Decor"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600">
              Price (₹)
            </label>
            <input
              name="price"
              type="number"
              value={formData.price}
              onChange={handleChange}
              className="w-full border border-stone-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        {/* Tags input */}
        <div>
          <label className="block text-sm font-medium text-stone-600">
            Tags
          </label>
          <div className="flex flex-wrap gap-2 border border-stone-300 rounded-md p-2">
            {formData.tags?.map((tag) => (
              <span
                key={tag}
                className="bg-stone-200 text-stone-800 px-2 py-1 text-xs rounded-md flex items-center gap-1"
              >
                {tag}
                <button
                  type="button"
                  className="text-red-600 font-bold"
                  onClick={() => removeTag(tag)}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Type and press Enter or ,"
              className="flex-1 min-w-[120px] border-none focus:ring-0 outline-none bg-transparent text-sm"
            />
          </div>
        </div>

        {/* Occasion input */}
        <div>
          <label className="block text-sm font-medium text-stone-600">
            Occasion
          </label>
          <div className="flex flex-wrap gap-2 border border-stone-300 rounded-md p-2">
            {formData.occasion?.map((o) => (
              <span
                key={o}
                className="bg-stone-200 text-stone-800 px-2 py-1 text-xs rounded-md flex items-center gap-1"
              >
                {o}
                <button
                  type="button"
                  className="text-red-600 font-bold"
                  onClick={() => removeOccasion(o)}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={occasionInput}
              onChange={(e) => setOccasionInput(e.target.value)}
              onKeyDown={handleOccasionKeyDown}
              placeholder="Type and press Enter or ,"
              className="flex-1 min-w-[120px] border-none focus:ring-0 outline-none bg-transparent text-sm"
            />
          </div>
        </div>

        {/* Recipient */}
        <div>
          <label className="block text-sm font-medium text-stone-600">
            Recipient
          </label>
          <select
            name="recipient"
            value={formData.recipient || ""}
            onChange={handleChange}
            className="w-full border border-stone-300 rounded-md px-3 py-2"
          >
            <option value="">Select recipient</option>
            <option value="Her">Her</option>
            <option value="Him">Him</option>
            <option value="Them">Them</option>
            <option value="Anyone">Anyone</option>
          </select>
        </div>

        {/* Story */}
        <div>
          <label className="block text-sm font-medium text-stone-600">
            Story
          </label>
          <textarea
            name="story"
            value={formData.story}
            onChange={handleChange}
            rows={3}
            className="w-full border border-stone-300 rounded-md px-3 py-2"
            placeholder="Describe the story or inspiration behind the product"
          />
        </div>

        {/* Affiliate Link */}
        <div>
          <label className="block text-sm font-medium text-stone-600">
            Affiliate Link
          </label>
          <input
            name="affiliateLink"
            value={formData.affiliateLink}
            onChange={handleChange}
            className="w-full border border-stone-300 rounded-md px-3 py-2"
            placeholder="https://example.com/product"
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-stone-600">
            Upload Image
          </label>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {uploading && <p className="text-sm text-stone-500">Uploading...</p>}
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview"
              className="mt-3 w-40 h-40 object-cover rounded-md border border-stone-300"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md border border-stone-300 text-stone-600 hover:bg-stone-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || uploading}
            className="px-4 py-2 rounded-md bg-stone-800 text-white hover:bg-stone-900 disabled:bg-stone-500"
          >
            {isSubmitting ? "Saving..." : "Save Product"}
          </button>
        </div>
      </form>
    </div>
  );
}
