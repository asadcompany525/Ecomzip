
-- Create payment_methods table for admin to manage payment accounts
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'bank_transfer',
  account_name text,
  account_number text,
  additional_info text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active payment methods" ON public.payment_methods FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Admins can manage payment methods" ON public.payment_methods FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to decrease stock when order is placed
CREATE OR REPLACE FUNCTION public.decrease_stock_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Decrease variant stock if variant_id exists
  IF NEW.variant_id IS NOT NULL THEN
    UPDATE product_variants SET stock = GREATEST(0, stock - NEW.quantity) WHERE id = NEW.variant_id;
  END IF;
  -- Decrease product stock
  IF NEW.product_id IS NOT NULL THEN
    UPDATE products SET stock = GREATEST(0, stock - NEW.quantity), sold = sold + NEW.quantity WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_decrease_stock
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.decrease_stock_on_order();

-- AI discount suggestions table
CREATE TABLE public.ai_discount_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  suggested_discount numeric NOT NULL DEFAULT 10,
  reason text,
  is_applied boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_discount_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage ai suggestions" ON public.ai_discount_suggestions FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
