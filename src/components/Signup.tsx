import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
} from "@mui/material";
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
  const [error, setError] = useState("");

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
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ padding: 4, mt: 8 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Chatify - Kayıt Ol
        </Typography>
        <form onSubmit={handleSignup}>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Kullanıcı Adı"
              variant="outlined"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
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
              Kayıt Ol
            </Button>
            <Button onClick={() => navigate("/")} color="secondary">
              Zaten hesabın var mı? Giriş yap
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

export default Signup;
