import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff, Lock, Email } from "@mui/icons-material";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebaseConfig";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleTogglePassword = () => setShowPassword((show) => !show);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #2196f3 0%, #0d47a1 100%)", // mavi degrade
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 2,
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={10}
          sx={{
            padding: 4,
            borderRadius: 3,
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          <Typography
            variant="h4"
            align="center"
            gutterBottom
            sx={{ fontWeight: "bold", color: "#1565c0", mb: 3 }}
          >
            Chatify
          </Typography>
          <Typography
            variant="h6"
            align="center"
            gutterBottom
            sx={{ mb: 4, color: "#1976d2" }}
          >
            Giriş Yap
          </Typography>

          <form onSubmit={handleLogin}>
            <TextField
              label="Email"
              variant="outlined"
              fullWidth
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: "#1565c0" }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Şifre"
              variant="outlined"
              fullWidth
              required
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: "#1565c0" }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="şifreyi göster/gizle"
                      onClick={handleTogglePassword}
                      edge="end"
                      sx={{ color: "#1565c0" }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {error && (
              <Typography
                color="error"
                variant="body2"
                sx={{ mt: 1, mb: 2, fontWeight: "bold" }}
              >
                {error}
              </Typography>
            )}
            <Button
              variant="contained"
              type="submit"
              fullWidth
              size="large"
              sx={{
                mt: 2,
                mb: 1,
                background: "linear-gradient(45deg, #1565c0 30%, #42a5f5 90%)",
                fontWeight: "bold",
                "&:hover": {
                  background:
                    "linear-gradient(45deg, #42a5f5 30%, #1565c0 90%)",
                },
              }}
            >
              Giriş Yap
            </Button>
          </form>

          <Button
            onClick={() => navigate("/signup")}
            fullWidth
            variant="text"
            sx={{
              mt: 1,
              color: "#1565c0",
              fontWeight: "bold",
              textTransform: "none",
              "&:hover": { backgroundColor: "rgba(21,101,192,0.1)" },
            }}
          >
            Hesabın yok mu? Kayıt ol
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
