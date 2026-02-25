-- Create a PostgreSQL function to insert payment (bypasses RLS)
CREATE OR REPLACE FUNCTION insert_payment(
  p_booking_id BIGINT,
  p_payment_method VARCHAR,
  p_slip_url TEXT,
  p_amount DECIMAL
)
RETURNS payments AS $$
DECLARE
  v_payment payments;
BEGIN
  INSERT INTO payments (
    booking_id,
    payment_method,
    slip_url,
    amount,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_booking_id,
    p_payment_method,
    p_slip_url,
    p_amount,
    'pending',
    NOW(),
    NOW()
  ) RETURNING * INTO v_payment;
  
  RETURN v_payment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION insert_payment(BIGINT, VARCHAR, TEXT, DECIMAL) TO authenticated, anon;
