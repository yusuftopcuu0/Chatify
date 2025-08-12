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
import {
  Visibility,
  VisibilityOff,
  Person,
  Email,
  Lock,
} from "@mui/icons-material";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../services/firebaseConfig";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { doc, setDoc, getDoc } from "firebase/firestore";

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleTogglePassword = () => setShowPassword((show) => !show);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const usernameDoc = await getDoc(
        doc(db, "usernames", username.toLowerCase())
      );
      if (usernameDoc.exists()) {
        setError("Bu kullanıcı adı zaten alınmış");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      if (user) {
        await setDoc(doc(db, "usernames", username.toLowerCase()), {
          uid: user.uid,
          createdAt: new Date().toISOString(),
        });

        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          username: username,
          createdAt: new Date().toISOString(),
        });

        useAuthStore.getState().setUser({
          email: user.email || "",
          uid: user.uid,
          username: username,
        });

        navigate("/chat");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)",
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
            sx={{ fontWeight: "bold", color: "#145a32", mb: 3 }}
          >
            Chatify
          </Typography>
          <Typography
            variant="h6"
            align="center"
            gutterBottom
            sx={{ mb: 4, color: "#145a32" }}
          >
            Kayıt Ol
          </Typography>

          <form onSubmit={handleSignup}>
            <TextField
              label="Kullanıcı Adı"
              variant="outlined"
              fullWidth
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person sx={{ color: "#145a32" }} />
                  </InputAdornment>
                ),
              }}
            />
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
                    <Email sx={{ color: "#145a32" }} />
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
                    <Lock sx={{ color: "#145a32" }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="şifreyi göster/gizle"
                      onClick={handleTogglePassword}
                      edge="end"
                      sx={{ color: "#145a32" }}
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
                background: "linear-gradient(45deg, #27ae60 30%, #2ecc71 90%)",
                fontWeight: "bold",
                "&:hover": {
                  background:
                    "linear-gradient(45deg, #2ecc71 30%, #27ae60 90%)",
                },
              }}
            >
              Kayıt Ol
            </Button>
          </form>

          <Button
            onClick={() => navigate("/")}
            fullWidth
            variant="text"
            sx={{
              mt: 1,
              color: "#145a32",
              fontWeight: "bold",
              textTransform: "none",
              "&:hover": { backgroundColor: "rgba(20,90,50,0.1)" },
            }}
          >
            Zaten hesabın var mı? Giriş yap
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default Signup;
