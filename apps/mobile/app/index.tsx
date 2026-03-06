import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { useAuthStore } from "../src/stores/authStore";

export default function Index() {
  const user = useAuthStore((s) => s.user);
  const checkSession = useAuthStore((s) => s.checkSession);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    checkSession().finally(() => setChecked(true));
  }, []);

  if (!checked) return null;

  if (user) {
    return <Redirect href="/(tabs)/" />;
  }

  return <Redirect href="/login" />;
}
