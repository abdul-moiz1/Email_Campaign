import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  businessType: z.string().min(2, "Business type is required"),
  city: z.string().min(2, "City is required"),
  province: z.string().min(2, "Province/State is required"),
  country: z.string().min(2, "Country is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    // Simulate API call
    console.log("Form Data Submitted:", data);
    
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    toast({
      title: "Submission successful!",
      description: "Redirecting you to the success page...",
    });
    
    setIsSubmitting(false);
    setLocation("/success");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Get Started</h1>
            <p className="text-slate-500">Tell us a bit about your business</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 ml-1">Business Type</label>
              <input
                {...register("businessType")}
                data-testid="input-business-type"
                placeholder="e.g. Marketing Agency"
                className={`w-full p-4 rounded-xl border ${
                  errors.businessType ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50/50"
                } focus:bg-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 outline-none placeholder:text-slate-400`}
              />
              {errors.businessType && (
                <p className="text-red-500 text-xs ml-1">{errors.businessType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 ml-1">City</label>
              <input
                {...register("city")}
                data-testid="input-city"
                placeholder="e.g. Toronto"
                className={`w-full p-4 rounded-xl border ${
                  errors.city ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50/50"
                } focus:bg-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 outline-none placeholder:text-slate-400`}
              />
              {errors.city && (
                <p className="text-red-500 text-xs ml-1">{errors.city.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 ml-1">State / Province</label>
                <input
                  {...register("province")}
                  data-testid="input-province"
                  placeholder="e.g. ON"
                  className={`w-full p-4 rounded-xl border ${
                    errors.province ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50/50"
                  } focus:bg-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 outline-none placeholder:text-slate-400`}
                />
                {errors.province && (
                  <p className="text-red-500 text-xs ml-1">{errors.province.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 ml-1">Country</label>
                <input
                  {...register("country")}
                  data-testid="input-country"
                  placeholder="e.g. Canada"
                  className={`w-full p-4 rounded-xl border ${
                    errors.country ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50/50"
                  } focus:bg-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 outline-none placeholder:text-slate-400`}
                />
                {errors.country && (
                  <p className="text-red-500 text-xs ml-1">{errors.country.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="button-submit"
              className="w-full py-4 mt-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-lg shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transform hover:-translate-y-1 active:translate-y-0 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                "Submit Application"
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
