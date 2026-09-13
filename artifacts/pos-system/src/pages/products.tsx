import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin-layout";
import {
  useGetProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
  useGetCategories, getGetProductsQueryKey, getNextProductNumber,
} from "@workspace/api-client-react";
import type { Product, ProductInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Plus, Search, Pencil, Trash2, ChefHat, Layers, 
  Settings2, Activity, Info, TrendingUp, Sparkles, CheckCircle2, AlertTriangle, Package2
} from "lucide-react";

const emptyForm = (): ProductInput => ({ 
  name: "", 
  number: 0, 
  price: 0, 
  cost: null, 
  barcode: null, 
  categoryId: null, 
  active: true, 
  stock: 0,
  min_stock: 10,
  max_stock: 1000,
  unit: "حبة",
  multi_units: "",
  supplier_id: 1,
  supplier_name: "",
  warehouse_id: 1,
  warehouse_name: "المخزن الرئيسي",
  image_url: "",
  tax_rate: 15.0,
  is_sellable: true,
  show_in_pos: true,
  item_type: "sellable"
});

const ITEM_TYPES = [
  { value: "sellable", label: "منتج للبيع المباشر", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "composite", label: "منتج مركب ذو وصفة (BOM)", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "semi_finished", label: "صنف نصف مصنع", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "raw_material", label: "مادة خام مخزنية", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "packaging", label: "مواد تعبئة وتغليف", color: "bg-pink-50 text-pink-700 border-pink-200" },
  { value: "supplies", label: "مستلزمات تشغيل", color: "bg-slate-50 text-slate-700 border-slate-200" },
];

export default function Products() {
  const [activeTab, setActiveTab] = useState("items");
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductInput>(emptyForm());
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Recipe Management State
  const [selectedRecipeProductId, setSelectedRecipeProductId] = useState<number | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<any[]>([]);
  const [newIngredientName, setNewIngredientName] = useState("");
  const [newIngredientQty, setNewIngredientQty] = useState<number>(1);
  const [newIngredientUnit, setNewIngredientUnit] = useState("جم");
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);

  // Production State
  const [productionProductId, setProductionProductId] = useState<number | null>(null);
  const [productionQty, setProductionQty] = useState<number>(10);
  const [isProducing, setIsProducing] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: products = [], isLoading } = useGetProducts({ search: search || undefined });
  const { data: categories = [] } = useGetCategories();
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  // Load suppliers and warehouses
  useEffect(() => {
    fetch("/api/inventory/summary")
      .then(res => res.json())
      .then(data => {
        if (data.suppliers) setSuppliers(data.suppliers);
        if (data.warehouses) setWarehouses(data.warehouses);
      })
      .catch(err => console.error("Error loading master data:", err));
  }, []);

  // Fetch recipe when selected product changes
  useEffect(() => {
    if (selectedRecipeProductId) {
      loadRecipe(selectedRecipeProductId);
    } else {
      setRecipeIngredients([]);
    }
  }, [selectedRecipeProductId]);

  const loadRecipe = (pid: number) => {
    setIsLoadingRecipe(true);
    const token = localStorage.getItem("pos_token") ?? "";
    fetch(`/api/recipes/${pid}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setRecipeIngredients(data.recipes || []);
      })
      .catch(err => console.error("Error loading recipe:", err))
      .finally(() => setIsLoadingRecipe(false));
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.refetchQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
  };

  const handleItemTypeChange = (type: string) => {
    // Automatically apply professional decoupled default rules
    const isSellable = type === "sellable" || type === "composite";
    const showInPos = type === "sellable" || type === "composite";
    
    setForm(prev => ({
      ...prev,
      item_type: type,
      is_sellable: isSellable,
      show_in_pos: showInPos,
      price: isSellable ? prev.price : 0 // Raw materials have zero selling price
    }));
  };

  const openAdd = async () => {
    setEditing(null);
    let nextNum = 1;
    try {
      nextNum = await getNextProductNumber();
    } catch (e) {
      console.warn("Failed to fetch next product number:", e);
    }
    const defaultForm = emptyForm();
    setForm({
      ...defaultForm,
      number: nextNum,
    });
    setShowDialog(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ 
      name: p.name, 
      number: p.number, 
      price: p.price, 
      cost: p.cost ?? null, 
      barcode: p.barcode ?? null, 
      categoryId: p.categoryId ?? null, 
      active: p.active, 
      stock: p.stock ?? null,
      min_stock: p.min_stock ?? 10,
      max_stock: p.max_stock ?? 1000,
      unit: p.unit ?? "حبة",
      multi_units: p.multi_units ?? "",
      supplier_id: p.supplier_id ?? 1,
      supplier_name: p.supplier_name ?? "",
      warehouse_id: p.warehouse_id ?? 1,
      warehouse_name: p.warehouse_name ?? "المخزن الرئيسي",
      image_url: p.image_url ?? "",
      tax_rate: p.tax_rate ?? 15.0,
      is_sellable: p.is_sellable !== undefined ? p.is_sellable : true,
      show_in_pos: p.show_in_pos !== undefined ? p.show_in_pos : true,
      item_type: p.item_type ?? "sellable"
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!form.name) {
      toast({ variant: "destructive", title: "يرجى تعبئة اسم الصنف" });
      return;
    }
    
    // For sellable items, price is required
    if ((form.is_sellable || form.show_in_pos) && (form.price === undefined || form.price === null)) {
      toast({ variant: "destructive", title: "الأصناف القابلة للبيع يجب أن تحتوي على سعر بيع صالح" });
      return;
    }

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form }, {
        onSuccess: () => { invalidate(); setShowDialog(false); toast({ title: "تم تحديث الصنف بنجاح" }); },
        onError: () => toast({ variant: "destructive", title: "فشل في تحديث بيانات الصنف" })
      });
    } else {
      createMutation.mutate({ data: form }, {
        onSuccess: () => { invalidate(); setShowDialog(false); toast({ title: "تم إضافة الصنف بنجاح" }); },
        onError: () => toast({ variant: "destructive", title: "فشل في إضافة الصنف الجديد" })
      });
    }
  };

  const handleDelete = (p: Product) => {
    if (!confirm(`حذف الصنف "${p.name}" نهائياً من قاعدة البيانات؟`)) return;
    deleteMutation.mutate({ id: p.id }, {
      onSuccess: () => { invalidate(); toast({ title: "تم حذف الصنف بنجاح" }); },
      onError: () => toast({ variant: "destructive", title: "فشل في الحذف: الصنف مرتبط بحركات مالية أو فواتير" })
    });
  };

  // Recipe (BOM) Management handlers
  const handleAddRecipeIngredient = () => {
    if (!selectedRecipeProductId) return;
    if (!newIngredientName) {
      toast({ variant: "destructive", title: "يرجى اختيار أو إدخال اسم المكون" });
      return;
    }

    const token = localStorage.getItem("pos_token") ?? "";
    fetch("/api/recipes", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({
        product_id: selectedRecipeProductId,
        ingredient_name: newIngredientName,
        quantity: newIngredientQty,
        unit: newIngredientUnit
      })
    })
      .then(async res => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error);
        }
        return res.json();
      })
      .then(() => {
        toast({ title: "تم إضافة المكون للوصفة" });
        loadRecipe(selectedRecipeProductId);
        setNewIngredientName("");
        setNewIngredientQty(1);
      })
      .catch(err => {
        toast({ variant: "destructive", title: "فشل الإضافة: " + err.message });
      });
  };

  const handleDeleteRecipeIngredient = (id: number) => {
    if (!selectedRecipeProductId) return;
    const token = localStorage.getItem("pos_token") ?? "";
    fetch(`/api/recipes/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error();
        toast({ title: "تم إزالة المكون من الوصفة" });
        loadRecipe(selectedRecipeProductId);
      })
      .catch(() => {
        toast({ variant: "destructive", title: "فشل حذف المكون" });
      });
  };

  // Production order handler
  const handleCreateProductionOrder = () => {
    if (!productionProductId || productionQty <= 0) {
      toast({ variant: "destructive", title: "يرجى اختيار الصنف وتحديد الكمية المطلوبة للإنتاج" });
      return;
    }

    setIsProducing(true);
    const token = localStorage.getItem("pos_token") ?? "";
    fetch("/api/recipes/produce", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        productId: productionProductId,
        quantity: productionQty
      })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشل تسجيل أمر الإنتاج");
        return data;
      })
      .then(data => {
        toast({ 
          title: "نجاح التصنيع والإنتاج", 
          description: data.message,
          className: "bg-emerald-600 text-white font-bold border-none"
        });
        invalidate();
        // Refresh production preview
        setProductionQty(10);
      })
      .catch(err => {
        toast({ 
          variant: "destructive", 
          title: "فشل عملية الإنتاج", 
          description: err.message 
        });
      })
      .finally(() => setIsProducing(false));
  };

  // Utility calculations for Recipe Costs
  const selectedProduct = products.find(p => p.id === selectedRecipeProductId);
  let totalBOMCost = 0;
  const processedIngredients = recipeIngredients.map(ing => {
    const matchingProduct = products.find(p => p.name.toLowerCase() === ing.ingredient_name.toLowerCase());
    const unitCost = matchingProduct ? (matchingProduct.cost || 0) : 0;
    const totalCost = unitCost * ing.quantity;
    totalBOMCost += totalCost;
    return {
      ...ing,
      unitCost,
      totalCost,
      matchingProduct
    };
  });

  const sellingPrice = selectedProduct?.price || 0;
  const grossMargin = sellingPrice - totalBOMCost;
  const foodCostPercent = sellingPrice > 0 ? (totalBOMCost / sellingPrice) * 100 : 0;

  // Food cost status formatting
  let foodCostBadgeColor = "text-emerald-600 bg-emerald-50 border-emerald-200";
  let foodCostStatusText = "ممتاز (تكلفة مثالية)";
  if (foodCostPercent > 35 && foodCostPercent <= 50) {
    foodCostBadgeColor = "text-amber-600 bg-amber-50 border-amber-200";
    foodCostStatusText = "مقبول (مستوى حرج)";
  } else if (foodCostPercent > 50) {
    foodCostBadgeColor = "text-red-600 bg-red-50 border-red-200";
    foodCostStatusText = "خطر (تكلفة طعام مرتفعة)";
  }

  // Production Preview calculations
  const prodProduct = products.find(p => p.id === productionProductId);
  const [prodRecipes, setProdRecipes] = useState<any[]>([]);
  useEffect(() => {
    if (productionProductId) {
      const token = localStorage.getItem("pos_token") ?? "";
      fetch(`/api/recipes/${productionProductId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setProdRecipes(data.recipes || []);
        });
    } else {
      setProdRecipes([]);
    }
  }, [productionProductId]);

  const productionIngredientsPreview = prodRecipes.map(rec => {
    const ingProduct = products.find(p => p.name.toLowerCase() === rec.ingredient_name.toLowerCase());
    const neededQty = rec.quantity * productionQty;
    const availableStock = ingProduct ? (ingProduct.stock ?? 0) : 0;
    const isSufficient = availableStock >= neededQty;
    return {
      name: rec.ingredient_name,
      qtyPerUnit: rec.quantity,
      neededQty,
      availableStock,
      isSufficient,
      unit: rec.unit,
      missingQty: isSufficient ? 0 : neededQty - availableStock
    };
  });

  const isProductionDisabled = productionIngredientsPreview.length === 0 || 
    productionIngredientsPreview.some(ing => !ing.isSufficient) || isProducing;

  return (
    <AdminLayout>
      <div className="space-y-6">
        
        {/* Page title and top header card */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Layers className="w-5 h-5" /></span>
              <h1 className="text-2xl font-bold text-slate-800">إدارة المستودعات والتركيبات (BOM)</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              نظام مطاعم متطور للفصل التام بين الأصناف المخزنية والمنتجات المخصصة للبيع، مع إدارة الوصفات وصالة التصنيع.
            </p>
          </div>
          
          {activeTab === "items" && (
            <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2">
              <Plus className="w-4 h-4" />
              إضافة صنف مخزني
            </Button>
          )}
        </div>

        {/* Tab system */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-100 p-1 rounded-lg flex w-full md:max-w-md">
            <TabsTrigger value="items" className="flex-1 font-bold text-xs gap-1 py-2">
              <Layers className="w-3.5 h-3.5" />
              الأصناف والمستودعات
            </TabsTrigger>
            <TabsTrigger value="recipes" className="flex-1 font-bold text-xs gap-1 py-2">
              <ChefHat className="w-3.5 h-3.5" />
              وصفات المأكولات (BOM)
            </TabsTrigger>
            <TabsTrigger value="production" className="flex-1 font-bold text-xs gap-1 py-2">
              <Activity className="w-3.5 h-3.5" />
              صالة الإنتاج والتصنيع
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Items List */}
          <TabsContent value="items" className="space-y-4">
            
            {/* Search box */}
            <div className="relative w-full max-w-sm">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="ابحث باسم الصنف، رقمه، أو الباركود..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9 text-xs"
              />
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-xl border border-slate-150 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-600">
                  <tr>
                    <th className="text-right p-4 font-semibold text-xs">كود الصنف</th>
                    <th className="text-right p-4 font-semibold text-xs">الاسم</th>
                    <th className="text-right p-4 font-semibold text-xs">نوع الصنف المخزني</th>
                    <th className="text-right p-4 font-semibold text-xs">التصنيف</th>
                    <th className="text-left p-4 font-semibold text-xs">سعر البيع</th>
                    <th className="text-left p-4 font-semibold text-xs">سعر الشراء (التكلفة)</th>
                    <th className="text-center p-4 font-semibold text-xs">الرصيد بالمخزن</th>
                    <th className="text-center p-4 font-semibold text-xs">قابل للبيع</th>
                    <th className="text-center p-4 font-semibold text-xs">عرض بـ POS</th>
                    <th className="text-center p-4 font-semibold text-xs">حالة النشاط</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={11} className="text-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                        <span className="text-xs text-slate-400 mt-2 block">جاري تحميل بيانات الأصناف...</span>
                      </td>
                    </tr>
                  ) : products?.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-slate-400 text-xs">لا توجد أصناف مسجلة في المخازن تطابق بحثك.</td>
                    </tr>
                  ) : (
                    products?.map((product) => {
                      const typeObj = ITEM_TYPES.find(t => t.value === product.item_type) || ITEM_TYPES[0];
                      return (
                        <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-mono font-bold text-blue-600 text-xs">{product.number}</td>
                          <td className="p-4 font-medium text-slate-800 text-xs">{product.name}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeObj.color}`}>
                              {typeObj.label}
                            </span>
                          </td>
                          <td className="p-4 text-slate-500 text-xs">{product.categoryName ?? "بدون تصنيف"}</td>
                          <td className="p-4 text-left font-bold text-amber-600 text-xs">
                            {product.is_sellable ? `${product.price.toFixed(2)}` : "-"}
                          </td>
                          <td className="p-4 text-left text-slate-500 font-mono text-xs">
                            {product.cost ? `${product.cost.toFixed(2)}` : "0.00"}
                          </td>
                          <td className="p-4 text-center">
                            <Badge className="bg-slate-100 hover:bg-slate-100 text-slate-700 font-bold border-none text-xs">
                              {product.stock !== null ? `${product.stock} ${product.unit ?? "حبة"}` : "0"}
                            </Badge>
                          </td>
                          <td className="p-4 text-center">
                            <Badge variant="outline" className={product.is_sellable ? "text-blue-600 border-blue-200 bg-blue-50/50" : "text-slate-400 border-slate-200 bg-slate-50"}>
                              {product.is_sellable ? "نعم" : "لا"}
                            </Badge>
                          </td>
                          <td className="p-4 text-center">
                            <Badge variant="outline" className={product.show_in_pos ? "text-emerald-600 border-emerald-200 bg-emerald-50/50" : "text-slate-400 border-slate-200 bg-slate-50"}>
                              {product.show_in_pos ? "معروض" : "مخفي"}
                            </Badge>
                          </td>
                          <td className="p-4 text-center">
                            <Badge variant="outline" className={product.active ? "text-green-600 border-green-200 bg-green-50/50" : "text-red-500 border-red-200 bg-red-50"}>
                              {product.active ? "نشط" : "موقوف"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => openEdit(product)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors" title="تعديل"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete(product)} className="p-1 text-slate-400 hover:text-red-600 transition-colors" title="حذف صنف"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* TAB 2: BOM / Recipes */}
          <TabsContent value="recipes" className="space-y-6">
            
            {/* Top configuration panel */}
            <div className="bg-white p-5 rounded-xl border border-slate-150 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="w-full md:max-w-sm space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">اختر وجبة أو صنف لضبط تركيبته ووصفته (BOM) *</label>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-blue-500"
                    value={selectedRecipeProductId ?? ""}
                    onChange={e => setSelectedRecipeProductId(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">-- اختر صنف/وجبة --</option>
                    {products
                      .filter(p => p.item_type === "composite" || p.item_type === "semi_finished" || p.item_type === "sellable")
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} [{p.item_type === "composite" ? "منتج مركب" : p.item_type === "semi_finished" ? "نصف مصنع" : "منتج بيع"}]
                        </option>
                      ))}
                  </select>
                </div>
                
                {selectedRecipeProductId && (
                  <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    {/* Stats box 1: Selling Price */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex-1 min-w-[120px] text-right">
                      <div className="text-[10px] text-slate-400 font-semibold">سعر بيع الوجبة</div>
                      <div className="text-base font-extrabold text-amber-600 mt-0.5">{sellingPrice.toFixed(2)} <span className="text-[10px] font-normal">ريال</span></div>
                    </div>
                    {/* Stats box 2: Ingredients Cost */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex-1 min-w-[120px] text-right">
                      <div className="text-[10px] text-slate-400 font-semibold">تكلفة المواد (BOM)</div>
                      <div className="text-base font-extrabold text-blue-600 mt-0.5">{totalBOMCost.toFixed(2)} <span className="text-[10px] font-normal">ريال</span></div>
                    </div>
                    {/* Stats box 3: Profit Margin */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex-1 min-w-[120px] text-right">
                      <div className="text-[10px] text-slate-400 font-semibold">هامش الربح المتوقع</div>
                      <div className="text-base font-extrabold text-emerald-600 mt-0.5">{grossMargin.toFixed(2)} <span className="text-[10px] font-normal">ريال</span></div>
                    </div>
                    {/* Stats box 4: Food Cost % */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex-1 min-w-[150px] text-right">
                      <div className="text-[10px] text-slate-400 font-semibold">نسبة تكلفة الطعام (Food Cost)</div>
                      <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md border ${foodCostBadgeColor}`}>
                          {foodCostStatusText}
                        </span>
                        <div className="text-base font-extrabold text-slate-800">{foodCostPercent.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedRecipeProductId && (
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      foodCostPercent <= 35 ? "bg-emerald-500" : foodCostPercent <= 50 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(100, foodCostPercent)}%` }}
                  />
                </div>
              )}
            </div>

            {selectedRecipeProductId ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Right side: Add Ingredients to recipe */}
                <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-150 shadow-sm space-y-4">
                  <h3 className="font-bold text-xs text-slate-800 border-b pb-2 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    إضافة مكون للوجبة
                  </h3>

                  {/* Input 1: Ingredient */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600">اختر المكون المخزني *</label>
                    <select
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs focus:border-blue-500"
                      value={newIngredientName}
                      onChange={e => {
                        const selName = e.target.value;
                        setNewIngredientName(selName);
                        // Suggest default units
                        const matched = products.find(p => p.name === selName);
                        if (matched && matched.unit) {
                          setNewIngredientUnit(matched.unit);
                        }
                      }}
                    >
                      <option value="">-- اختر مادة خام / تعبئة --</option>
                      {products
                        .filter(p => p.id !== selectedRecipeProductId && p.item_type !== "sellable")
                        .map(p => (
                          <option key={p.id} value={p.name}>
                            {p.name} (متوفر: {p.stock ?? 0} {p.unit})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Input 2: Quantity */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">الكمية المستهلكة *</label>
                      <Input
                        type="number"
                        step="0.001"
                        min="0.001"
                        className="text-xs"
                        value={newIngredientQty || ""}
                        onChange={e => setNewIngredientQty(parseFloat(e.target.value) || 0)}
                        dir="ltr"
                      />
                    </div>

                    {/* Input 3: Unit */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">وحدة القياس</label>
                      <select
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs focus:border-blue-500"
                        value={newIngredientUnit}
                        onChange={e => setNewIngredientUnit(e.target.value)}
                      >
                        <option value="جم">جم (جرام)</option>
                        <option value="كجم">كجم (كيلوجرام)</option>
                        <option value="مل">مل (مليلتر)</option>
                        <option value="لتر">لتر</option>
                        <option value="حبة">حبة</option>
                        <option value="كيس">كيس</option>
                        <option value="علبة">علبة</option>
                      </select>
                    </div>
                  </div>

                  <Button onClick={handleAddRecipeIngredient} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2 gap-1.5 mt-2">
                    <Plus className="w-4 h-4" />
                    تأكيد وإضافة المكون لوصفة الوجبة
                  </Button>
                  
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-1 text-[11px] text-slate-500">
                    <div className="font-bold text-slate-600">إرشادات ضبط المكونات:</div>
                    <div>• لضمان صحة محاسبة التكاليف، تأكد من مطابقة اسم المكون تماماً للاسم المسجل في المستودع.</div>
                    <div>• يتم تحويل الكميات وخصمها من المستودع آلياً عند بيع هذه الوجبة في الكاشير POS.</div>
                  </div>
                </div>

                {/* Left side: Ingredients List */}
                <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-150 shadow-sm space-y-3">
                  <h3 className="font-bold text-xs text-slate-800 border-b pb-2 flex items-center gap-1.5">
                    <ChefHat className="w-4 h-4 text-blue-600" />
                    المكونات المسجلة حالياً لوصفة [{selectedProduct?.name}]
                  </h3>

                  {isLoadingRecipe ? (
                    <div className="text-center py-12 text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                      <span className="text-xs block mt-2">جاري استرجاع الوصفة...</span>
                    </div>
                  ) : processedIngredients.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs border border-dashed rounded-lg">
                      لا توجد مكونات مسجلة لهذه الوجبة حالياً. يرجى البدء في إضافتها من النموذج على اليمين.
                    </div>
                  ) : (
                    <div className="overflow-hidden border border-slate-100 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                          <tr>
                            <th className="text-right p-3 font-semibold">اسم المكون المخزني</th>
                            <th className="text-center p-3 font-semibold">الكمية المستهلكة</th>
                            <th className="text-center p-3 font-semibold">وحدة القياس</th>
                            <th className="text-left p-3 font-semibold">سعر تكلفة المادة</th>
                            <th className="text-left p-3 font-semibold">إجمالي التكلفة</th>
                            <th className="p-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {processedIngredients.map(ing => (
                            <tr key={ing.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-3 font-medium text-slate-800">{ing.ingredient_name}</td>
                              <td className="p-3 text-center font-bold font-mono text-purple-600">{ing.quantity}</td>
                              <td className="p-3 text-center text-slate-500">{ing.unit}</td>
                              <td className="p-3 text-left text-slate-400 font-mono">
                                {ing.unitCost.toFixed(2)}
                              </td>
                              <td className="p-3 text-left font-bold text-blue-600 font-mono">
                                {ing.totalCost.toFixed(2)}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleDeleteRecipeIngredient(ing.id)}
                                  className="text-slate-400 hover:text-red-500 p-1"
                                  title="حذف من الوصفة"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-12 text-center text-slate-400 text-xs border border-dashed rounded-xl">
                <ChefHat className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                يرجى اختيار صنف أو وجبة من القائمة بالأعلى لعرض وإدارة وصفتها الغذائية وتكلفتها وحسابات الربحية الخاصة بها.
              </div>
            )}
          </TabsContent>

          {/* TAB 3: Production/Manufacturing Orders */}
          <TabsContent value="production" className="space-y-6">
            
            <div className="bg-white p-5 rounded-xl border border-slate-150 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 border-b pb-2">
                <Package2 className="w-5 h-5 text-emerald-600" />
                تسجيل وعاء إنتاج وتصنيع داخلي (Production & Stock Conversion)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">الصنف المراد تصنيعه / إنتاجه</label>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-blue-500"
                    value={productionProductId ?? ""}
                    onChange={e => setProductionProductId(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">-- اختر الصنف المصنع --</option>
                    {products
                      .filter(p => p.item_type === "composite" || p.item_type === "semi_finished")
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (الرصيد الحالي بالمخازن: {p.stock ?? 0} {p.unit})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">الكمية المستهدفة للإنتاج</label>
                  <Input
                    type="number"
                    min="1"
                    className="text-xs"
                    value={productionQty || ""}
                    onChange={e => setProductionQty(parseInt(e.target.value) || 0)}
                    dir="ltr"
                  />
                </div>

                <Button 
                  onClick={handleCreateProductionOrder}
                  disabled={isProductionDisabled}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProducing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  صرف المكونات وتصنيع الكمية
                </Button>
              </div>
            </div>

            {productionProductId ? (
              <div className="bg-white p-5 rounded-xl border border-slate-150 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-bold text-xs text-slate-800">
                    معاينة متطلبات تصنيع لعدد {productionQty} {prodProduct?.unit} من [{prodProduct?.name}]
                  </h4>
                  {productionIngredientsPreview.some(ing => !ing.isSufficient) && (
                    <Badge className="bg-red-50 text-red-600 border border-red-200 font-bold gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      عجز في المكونات: لا يمكن بدء الإنتاج
                    </Badge>
                  )}
                </div>

                {productionIngredientsPreview.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 border border-dashed rounded-lg">
                    لا يمكن تحضير معاينة المكونات لأن هذا الصنف ليس له أي وصفة مسجلة. يرجى التوجه لعلامة تبويب "وصفات المأكولات" لإضافة مكوناته أولاً.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="overflow-hidden border border-slate-100 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                          <tr>
                            <th className="text-right p-3 font-semibold">اسم المكون المطلوب</th>
                            <th className="text-center p-3 font-semibold">المطلوب للوحدة</th>
                            <th className="text-center p-3 font-semibold">إجمالي المطلوب للدفعة</th>
                            <th className="text-center p-3 font-semibold">الرصيد المتوفر بالمستودع</th>
                            <th className="text-center p-3 font-semibold">العجز / الفائض</th>
                            <th className="text-center p-3 font-semibold">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {productionIngredientsPreview.map((ing, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-3 font-medium text-slate-800">{ing.name}</td>
                              <td className="p-3 text-center font-mono text-slate-500">{ing.qtyPerUnit} {ing.unit}</td>
                              <td className="p-3 text-center font-bold font-mono text-purple-600">{ing.neededQty} {ing.unit}</td>
                              <td className="p-3 text-center font-bold font-mono text-slate-700">{ing.availableStock} {ing.unit}</td>
                              <td className="p-3 text-center font-mono">
                                {ing.isSufficient ? (
                                  <span className="text-slate-400">لا يوجد عجز</span>
                                ) : (
                                  <span className="text-red-500 font-bold">-{ing.missingQty.toFixed(2)} {ing.unit}</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {ing.isSufficient ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-150">كافٍ ومؤهل</span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-150">عجز مخزني</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold block text-slate-700 mb-1">آلية عمل أمر التصنيع:</span>
                        عند النقر على زر "صرف المكونات وتصنيع الكمية"، سيقوم النظام في عملية واحدة آمنة (Database Transaction) بخصم إجمالي الكميات المطلوبة للمواد الخام من مستودعاتك وزيادة رصيد الصنف المصنع، مما يضمن دقة رصيدك المالي وتقارير الأرباح والخسائر وحسابات تكاليف الطعام.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 p-12 text-center text-slate-400 text-xs border border-dashed rounded-xl">
                <Package2 className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                اختر صنفاً مصنعاً أو نصف مصنع من القائمة بالأعلى لمعاينة مكونات أمر الإنتاج والتصنيع الخاص به والتحقق من كفاية المخزون قبل المباشرة بالتصنيع.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit/Add Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent dir="rtl" className="max-w-2xl bg-white rounded-xl shadow-lg border border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">
              {editing ? `تعديل الصنف المخزني: ${editing.name}` : "إضافة صنف مخزني جديد للمستودعات"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto p-1">
            
            {/* Left Column: Core Fields */}
            <div className="space-y-4 p-4 border border-slate-100 rounded-lg bg-slate-50/40">
              <h4 className="font-bold text-xs text-blue-600 border-b pb-1.5 flex items-center gap-1.5">
                <Settings2 className="w-4 h-4" />
                البيانات الأساسية ونوع الصنف
              </h4>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">نوع الصنف المخزني *</label>
                <select
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:border-blue-500"
                  value={form.item_type || "sellable"}
                  onChange={e => handleItemTypeChange(e.target.value)}
                >
                  {ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">اسم الصنف / المنتج *</label>
                <Input 
                  className="text-xs" 
                  value={form.name} 
                  onChange={e => setForm({ ...form, name: e.target.value })} 
                  placeholder="مثال: دقيق فاخر، كولا، برياني دجاج..." 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">كود الصنف (تلقائي)</label>
                  <Input 
                    type="number" 
                    className="text-xs font-mono"
                    placeholder="تلقائي..."
                    value={form.number || ""} 
                    onChange={e => setForm({ ...form, number: parseInt(e.target.value) || 0 })} 
                    dir="ltr" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">الباركود الدولي</label>
                  <Input 
                    className="text-xs font-mono" 
                    placeholder="الباركود..." 
                    value={form.barcode ?? ""} 
                    onChange={e => setForm({ ...form, barcode: e.target.value || null })} 
                    dir="ltr" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">سعر البيع</label>
                  <Input 
                    className="text-xs font-bold text-amber-600" 
                    type="number" 
                    step="0.01" 
                    disabled={!form.is_sellable}
                    value={form.price || ""} 
                    onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} 
                    dir="ltr" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">سعر الشراء</label>
                  <Input 
                    className="text-xs font-bold text-blue-600" 
                    type="number" 
                    step="0.01" 
                    value={form.cost ?? ""} 
                    onChange={e => setForm({ ...form, cost: e.target.value ? parseFloat(e.target.value) : null })} 
                    dir="ltr" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">الضريبة %</label>
                  <Input 
                    className="text-xs font-mono" 
                    type="number" 
                    step="0.1" 
                    value={form.tax_rate ?? 15} 
                    onChange={e => setForm({ ...form, tax_rate: parseFloat(e.target.value) || 0 })} 
                    dir="ltr" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">التصنيف الرئيسي للـ POS</label>
                <select
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs focus:border-blue-500"
                  value={form.categoryId ?? ""}
                  onChange={e => setForm({ ...form, categoryId: e.target.value ? parseInt(e.target.value) : null })}
                >
                  <option value="">بدون تصنيف</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">رابط صورة الصنف</label>
                <Input 
                  className="text-xs font-mono" 
                  placeholder="https://example.com/image.png" 
                  value={form.image_url ?? ""} 
                  onChange={e => setForm({ ...form, image_url: e.target.value || "" })} 
                  dir="ltr" 
                />
              </div>
            </div>

            {/* Right Column: Warehouse & Decoupled Visibility */}
            <div className="space-y-4 p-4 border border-slate-100 rounded-lg bg-slate-50/40">
              <h4 className="font-bold text-xs text-emerald-600 border-b pb-1.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                التحكم بالظهور والخصائص المخزنية
              </h4>

              {/* Decoupling Switches: core requirements */}
              <div className="p-3 bg-white rounded-lg border border-slate-100 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-slate-800 block">صنف متاح للبيع (Sellable Item)</label>
                    <span className="text-[10px] text-slate-400 block">عند إلغائه لن يظهر كصنف قابل للبيع في أي فواتير.</span>
                  </div>
                  <Switch checked={form.is_sellable} onCheckedChange={v => setForm({ ...form, is_sellable: v })} />
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-slate-800 block">عرض في شاشة الكاشير (Show in POS)</label>
                    <span className="text-[10px] text-slate-400 block">عند إلغائه سيختفي تلقائياً من قائمة مبيعات الكاشير.</span>
                  </div>
                  <Switch checked={form.show_in_pos} onCheckedChange={v => setForm({ ...form, show_in_pos: v })} />
                </div>

                <div className="flex items-center justify-between border-t pt-3">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-slate-800 block">حالة النشاط في النظام</label>
                    <span className="text-[10px] text-slate-400 block">توقيف الصنف مؤقتاً في النظام بأكمله.</span>
                  </div>
                  <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">الوحدة الأساسية</label>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs focus:border-blue-500"
                    value={form.unit ?? "حبة"}
                    onChange={e => setForm({ ...form, unit: e.target.value })}
                  >
                    <option value="حبة">حبة</option>
                    <option value="كرتون">كرتون</option>
                    <option value="كيس">كيس</option>
                    <option value="علبة">علبة</option>
                    <option value="كجم">كجم</option>
                    <option value="لتر">لتر</option>
                    <option value="متر">متر</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">الوحدات والتحويلات</label>
                  <Input 
                    className="text-xs font-mono" 
                    placeholder="مثال: كرتون:12" 
                    value={form.multi_units ?? ""} 
                    onChange={e => setForm({ ...form, multi_units: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 font-bold text-emerald-600">الرصيد الافتتاحي</label>
                  <Input className="text-xs font-mono" type="number" value={form.stock ?? 0} onChange={e => setForm({ ...form, stock: e.target.value ? parseInt(e.target.value) : 0 })} dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">حد الطلب الأدنى</label>
                  <Input className="text-xs font-mono text-amber-600" type="number" value={form.min_stock ?? 10} onChange={e => setForm({ ...form, min_stock: parseInt(e.target.value) || 0 })} dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">الحد الأعلى</label>
                  <Input className="text-xs font-mono text-red-600" type="number" value={form.max_stock ?? 1000} onChange={e => setForm({ ...form, max_stock: parseInt(e.target.value) || 0 })} dir="ltr" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">المورد الافتراضي</label>
                <select
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs focus:border-blue-500"
                  value={form.supplier_id ?? ""}
                  onChange={e => {
                    const selId = parseInt(e.target.value) || 1;
                    const selName = suppliers.find(s => s.id === selId)?.name || "";
                    setForm({ ...form, supplier_id: selId, supplier_name: selName });
                  }}
                >
                  <option value="">بدون مورد</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">المستودع الافتراضي</label>
                <select
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs focus:border-blue-500"
                  value={form.warehouse_name ?? "المخزن الرئيسي"}
                  onChange={e => {
                    const selName = e.target.value;
                    const selId = warehouses.find(w => w.name === selName)?.id || 1;
                    setForm({ ...form, warehouse_id: selId, warehouse_name: selName });
                  }}
                >
                  <option value="المخزن الرئيسي">المخزن الرئيسي</option>
                  {warehouses.map((w: any) => <option key={w.id} value={w.name}>{w.name}</option>)}
                </select>
              </div>
            </div>

          </div>

          <DialogFooter className="border-t pt-4 flex gap-3">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="text-xs font-bold">إلغاء</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5">
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
              حفظ بيانات الصنف المستودعي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
