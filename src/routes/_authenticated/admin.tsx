import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminCreateProduct,
  adminDeleteProduct,
  adminUpdateProduct,
  fetchIsAdmin,
} from "@/lib/admin.functions";
import { fetchProducts } from "@/lib/catalog.functions";
import { fetchAllOrders, setOrderStatus } from "@/lib/order.functions";
import { ORDER_STATUSES, formatMoney } from "@/lib/shop-types";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — ShopEZ" },
      { name: "description", content: "Manage ShopEZ products and customer order statuses." },
      { property: "og:title", content: "Admin dashboard — ShopEZ" },
      { property: "og:description", content: "Product catalog and order management for ShopEZ staff." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

const emptyForm = {
  id: "",
  name: "",
  description: "",
  price: "",
  discount: "0",
  category: "",
  imageUrl: "",
  stock: "0",
};

function AdminDashboard() {
  const queryClient = useQueryClient();
  const { data: access, isLoading: checking } = useQuery({
    queryKey: ["is-admin-server"],
    queryFn: () => fetchIsAdmin(),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts(),
    enabled: access?.isAdmin === true,
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["all-orders"],
    queryFn: () => fetchAllOrders(),
    enabled: access?.isAdmin === true,
  });

  const [form, setForm] = useState(emptyForm);

  const refreshProducts = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const payload = () => ({
    name: form.name,
    description: form.description,
    price: Number(form.price),
    discount: Number(form.discount),
    category: form.category,
    imageUrl: form.imageUrl,
    stock: Number(form.stock),
  });

  const save = useMutation({
    mutationFn: async () =>
      form.id
        ? adminUpdateProduct({ data: { ...payload(), id: form.id } })
        : adminCreateProduct({ data: payload() }),
    onSuccess: () => {
      setForm(emptyForm);
      refreshProducts();
      toast.success("Product saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (productId: string) => adminDeleteProduct({ data: { productId } }),
    onSuccess: () => {
      refreshProducts();
      toast.success("Product deleted");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const status = useMutation({
    mutationFn: (input: { orderId: string; status: string }) => setOrderStatus({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-orders"] });
      toast.success("Order status updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (checking) {
    return <p className="mx-auto max-w-3xl px-4 py-16 text-muted-foreground">Checking access...</p>;
  }

  if (!access?.isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-semibold text-foreground">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This account isn't a store administrator.
        </p>
        <Button asChild className="mt-6">
          <Link to="/admin/login">Admin sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground">Admin dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {products.length} products · {orders.length} orders
      </p>

      <Tabs defaultValue="products" className="mt-6">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <div className="mt-4 grid gap-6 lg:grid-cols-[360px_1fr]">
            <Card className="h-fit">
              <CardContent className="p-5">
                <h2 className="font-semibold text-foreground">
                  {form.id ? "Edit product" : "Add product"}
                </h2>
                <form
                  className="mt-4 space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    save.mutate();
                  }}
                >
                  <div>
                    <Label htmlFor="a-name">Name</Label>
                    <Input
                      id="a-name"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="a-desc">Description</Label>
                    <Textarea
                      id="a-desc"
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="a-price">Price (₹)</Label>
                      <Input
                        id="a-price"
                        type="number"
                        step="0.01"
                        required
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="a-discount">Discount %</Label>
                      <Input
                        id="a-discount"
                        type="number"
                        value={form.discount}
                        onChange={(e) => setForm({ ...form, discount: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="a-category">Category</Label>
                      <Input
                        id="a-category"
                        required
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="a-stock">Stock</Label>
                      <Input
                        id="a-stock"
                        type="number"
                        value={form.stock}
                        onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="a-image">Image URL</Label>
                    <Input
                      id="a-image"
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button type="submit" disabled={save.isPending}>
                      <Plus className="mr-1.5 h-4 w-4" />
                      {form.id ? "Update" : "Create"}
                    </Button>
                    {form.id && (
                      <Button type="button" variant="outline" onClick={() => setForm(emptyForm)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {products.map((product) => (
                <Card key={product.id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-14 w-14 rounded-md border border-border object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.category} · {formatMoney(product.price)} · {product.discount}% off ·
                        stock {product.stock}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Edit ${product.name}`}
                      onClick={() =>
                        setForm({
                          id: product.id,
                          name: product.name,
                          description: product.description,
                          price: String(product.price),
                          discount: String(product.discount),
                          category: product.category,
                          imageUrl: product.image_url,
                          stock: String(product.stock),
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${product.name}`}
                      className="text-destructive hover:text-destructive"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <div className="mt-4 space-y-3">
            {orders.length === 0 && <p className="text-muted-foreground">No orders yet.</p>}
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <Badge variant="secondary">{order.payment_method}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {order.full_name} · {new Date(order.created_at).toLocaleDateString()}
                    </span>
                    <span className="ml-auto font-semibold">{formatMoney(order.total_amount)}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {order.items.map((i) => `${i.product_name} x${i.quantity}`).join(", ")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {order.address_line}, {order.city} {order.postal_code}, {order.country}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select
                      value={order.order_status}
                      onValueChange={(value) => status.mutate({ orderId: order.id, status: value })}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
