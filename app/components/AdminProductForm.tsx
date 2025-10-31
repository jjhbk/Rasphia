"use client";
import React, { useState, useEffect } from "react";

interface Product {
  _id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  brand?: string;
}

interface AdminProductFormProps {
  product?: Product | null;
  onSave: (product: Product) => Promise<void> | void;
  onCancel: () => void;
}

const AdminProductForm: React.FC<AdminProductFormProps> = ({
  product,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<Product>({
    _id: product?._id,
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price || 0,
    category: product?.category || "",
    imageUrl: product?.imageUrl || "",
    brand: product?.brand || "",
  });

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(
    product?.imageUrl || ""
  );

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Product name is required";
    if (!formData.description.trim())
      newErrors.description = "Description is required";
    if (!formData.category.trim()) newErrors.category = "Category is required";
    if (!formData.price || formData.price <= 0)
      newErrors.price = "Valid price required";
    if (!formData.imageUrl.trim() && !file)
      newErrors.imageUrl = "Image or file required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "price" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setImagePreview(URL.createObjectURL(selected));
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!file) return formData.imageUrl;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
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
        {/* Inputs */}
        <div>
          <label className="block text-sm font-medium text-stone-600">
            Product Name
          </label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full border border-stone-300 rounded-md px-3 py-2 focus:ring-amber-500"
            placeholder="Enter product name"
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-600">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full border border-stone-300 rounded-md px-3 py-2 focus:ring-amber-500"
            placeholder="Describe the product"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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

          <div>
            <label className="block text-sm font-medium text-stone-600">
              Category
            </label>
            <input
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full border border-stone-300 rounded-md px-3 py-2"
              placeholder="E.g. Perfume, Gift Box"
            />
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-stone-600">
            Upload Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-sm text-stone-700 mt-1"
          />
          {uploading && (
            <p className="text-sm text-stone-500 mt-1">Uploading...</p>
          )}
          {imagePreview && (
            <div className="mt-3">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-40 h-40 object-cover rounded-md border border-stone-300"
              />
            </div>
          )}
        </div>

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
};

export default AdminProductForm;
