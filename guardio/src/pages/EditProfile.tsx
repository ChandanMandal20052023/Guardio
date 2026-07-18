// src/pages/EditProfile.tsx
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { User as UserIcon, Mail, Phone, MapPin, Save, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "@/services/api";
import { toast } from "sonner";

interface ProfileFormState {
  name: string;
  email: string;
  phone: string;
  location: string;
}

export default function EditProfile() {
  const { user, setUser } = useAuth(); // adjust if your useAuth exposes a different updater
  const navigate = useNavigate();

  const [form, setForm] = useState<ProfileFormState>({
    name: user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "",
    email: user?.email || "",
    phone: user?.phone_number || "",
    location: user?.city || "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        email: user.email || "",
        phone: user.phone_number || "",
        location: user.city || "",
      });
    }
  }, [user]);
  const [errors, setErrors] = useState<Partial<ProfileFormState>>({});
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof ProfileFormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const next: Partial<ProfileFormState> = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!form.email.trim()) {
      next.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      next.email = "Enter a valid email";
    }
    if (form.phone && !/^\+?[\d\s-]{7,15}$/.test(form.phone)) {
      next.phone = "Enter a valid phone number";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const nameInput = form.name.trim();
      const [firstName, ...lastNameArr] = nameInput.split(' ');
      const lastName = lastNameArr.join(' ');

      const res = await api.patch("/auth/profile/", {
        first_name: firstName,
        last_name: lastName,
        phone_number: form.phone,
        city: form.location,
      });

      // keep local auth state in sync if setUser is available
      setUser?.(res.data);

      toast.success("Profile updated successfully");
      navigate("/profile");
    } catch (err: any) {
      console.error("Profile update error:", err.response?.data);
      const data = err.response?.data;
      let message = "Failed to update profile. Please try again.";
      if (data) {
        if (data.detail) {
          message = data.detail;
        } else if (typeof data === "object") {
          const firstKey = Object.keys(data)[0];
          if (firstKey && Array.isArray(data[firstKey])) {
            message = `${firstKey}: ${data[firstKey].join(", ")}`;
          } else if (firstKey && typeof data[firstKey] === "string") {
            message = `${firstKey}: ${data[firstKey]}`;
          }
        }
      }
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: "name" as const, label: "Full name", icon: UserIcon, type: "text", placeholder: "Chandan Kumar Mandal" },
    { key: "email" as const, label: "Email address", icon: Mail, type: "email", placeholder: "you@example.com" },
    { key: "phone" as const, label: "Phone", icon: Phone, type: "tel", placeholder: "+91 98765 43210" },
    { key: "location" as const, label: "Location", icon: MapPin, type: "text", placeholder: "Mumbai, India" },
  ];

  return (
    <AppLayout title="Edit Profile">
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="font-display text-xl font-bold">Edit Profile</h2>
              <p className="text-xs text-muted-foreground">Update your personal details</p>
            </div>
          </div>

          <div className="space-y-4">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key} className="text-xs flex items-center gap-1.5">
                  <f.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {f.label}
                </Label>
                <Input
                  id={f.key}
                  type={f.type}
                  value={form[f.key]}
                  onChange={handleChange(f.key)}
                  placeholder={f.placeholder}
                  className={errors[f.key] ? "border-destructive" : ""}
                  disabled={saving || f.key === "email"}
                />
                {errors[f.key] && (
                  <p className="text-xs text-destructive">{errors[f.key]}</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate("/profile")}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Changes
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}