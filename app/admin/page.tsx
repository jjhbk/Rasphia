"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import AdminProductForm from "../components/AdminProductForm";
import { Product } from "../types";

/*interface Product {
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
}*/

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Load all products
  useEffect(() => {
    if (status === "authenticated") loadProducts();
  }, [status]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/products/get");
      if (!res.ok) throw new Error(`Failed to fetch products ${res.body}`);
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error(err);
      setError("Could not load products");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Add / Update product
  const handleSave = async (product: Product) => {
    try {
      const isEdit = Boolean(product._id);
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? "/api/products/update" : "/api/products/add";

      // Normalize _id to a string "id" field for the API
      const payload = {
        ...product,
        ...(isEdit ? { id: String(product._id) } : {}), // 👈 critical line
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("❌ API Error Response:", text);
        throw new Error(`Failed to save product (${res.status})`);
      }

      // Reset UI state and reload
      setEditingProduct(null);
      setIsAdding(false);
      await loadProducts();

      alert(`Product ${isEdit ? "updated" : "added"} successfully`);
    } catch (err) {
      console.error("❌ handleSave error:", err);
      alert("❌ Error saving product. Check console for details.");
    }
  };

  // ✅ Delete product
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const res = await fetch("/api/products/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error("Failed to delete product");

      setProducts((prev) => prev.filter((p) => p._id !== id));
      alert("Product deleted successfully");
    } catch (err) {
      console.error(err);
      alert("❌ Error deleting product");
    }
  };

  // 🔒 Only admin access (client-side)
  const isAdmin = session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  if (status === "loading") return <p className="p-6">Loading...</p>;
  if (!isAdmin)
    return (
      <p className="p-6 text-red-600 font-medium">
        Access Denied. Only admins can access this dashboard.
      </p>
    );

  return (
    <div className="min-h-screen bg-stone-100 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-3xl font-serif text-amber-900 mb-6 text-center">
          Admin Dashboard
        </h1>

        {error && (
          <p className="text-red-600 text-center mb-4 font-medium">{error}</p>
        )}

        {!isAdding && !editingProduct && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-stone-800 text-white px-4 py-2 rounded-md mb-6 hover:bg-stone-700"
          >
            ➕ Add Product
          </button>
        )}

        {(isAdding || editingProduct) && (
          <AdminProductForm
            product={editingProduct}
            onSave={handleSave}
            onCancel={() => {
              setIsAdding(false);
              setEditingProduct(null);
            }}
          />
        )}

        {isLoading ? (
          <p className="text-center text-stone-500 mt-8">Loading products...</p>
        ) : products.length === 0 ? (
          <p className="text-center text-stone-500 mt-8">
            No products found. Add your first one!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <div
                key={p._id}
                className="border border-stone-300 rounded-lg p-4 flex flex-col gap-2 bg-white shadow-sm hover:shadow-md transition"
              >
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-full h-40 object-cover rounded-md"
                />
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-medium text-stone-800">
                    {p.name}
                  </h3>
                  <p className="text-sm text-stone-500">{p.brand}</p>
                  <p className="text-sm text-stone-500 italic">
                    {p.category} • {p.recipient || "Any"}
                  </p>
                  <p className="text-amber-900 font-semibold">
                    ₹{(p.price as number).toFixed(2)}
                  </p>
                  <p className="text-xs text-stone-400 line-clamp-2">
                    {p.story}
                  </p>
                </div>
                <div className="flex justify-between mt-3">
                  <button
                    onClick={() => setEditingProduct(p)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p._id!)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
