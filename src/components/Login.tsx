import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
} from "@mui/material";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebaseConfig";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const user = auth.currentUser;
      if (user) {
        useAuthStore.getState().setUser({
          email: user.email || "",
          uid: user.uid,
        });
      }
      navigate("/chat");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ padding: 4, mt: 8 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Chatify - Giriş Yap
        </Typography>
        <form onSubmit={handleLogin}>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Email"
              variant="outlined"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            />
            <TextField
              label="Şifre"
              variant="outlined"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
            />
            <Button variant="contained" color="primary" type="submit">
              Giriş Yap
            </Button>
            <Button onClick={() => navigate("/signup")} color="secondary">
              Hesabın yok mu? Kayıt ol
            </Button>
            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default Login;
