import { useEffect, useState, useRef } from "react";
import { auth, db } from "../services/firebaseConfig";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import {
  Button,
  Container,
  Paper,
  Typography,
  TextField,
  Box,
  List,
  ListItem,
  Avatar,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import LogoutIcon from "@mui/icons-material/Logout";

interface Message {
  id: string;
  text: string;
  user: string;
  timestamp: Timestamp;
}

const Chat = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserEmail(user.email);
        // Subscribe to messages
        const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
        const unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
          const messagesList: Message[] = [];
          querySnapshot.forEach((doc) => {
            messagesList.push({ id: doc.id, ...doc.data() } as Message);
          });
          setMessages(messagesList);
        });
        
        return () => unsubscribeMessages();
      } else {
        navigate("/");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() === "" || !userEmail) return;

    try {
      await addDoc(collection(db, "messages"), {
        text: message,
        user: userEmail,
        timestamp: serverTimestamp(),
      });
      setMessage("");
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  return (
    <Container
      maxWidth="md"
      sx={{ height: "100vh", display: "flex", flexDirection: "column", p: 2 }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h4" component="h1">
          Chatify
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="subtitle1">{userEmail}</Typography>
          <Button
            onClick={handleLogout}
            variant="outlined"
            color="secondary"
            startIcon={<LogoutIcon />}
          >
            Çıkış
          </Button>
        </Box>
      </Box>

      <Paper
        elevation={3}
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          p: 2,
          mb: 2,
          overflow: "hidden",
        }}
      >
        <List
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            mb: 2,
            pr: 1,
            "&::-webkit-scrollbar": {
              width: "0.4em",
            },
            "&::-webkit-scrollbar-track": {
              boxShadow: "inset 0 0 6px rgba(0,0,0,0.1)",
              borderRadius: "10px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "rgba(0,0,0,.1)",
              borderRadius: "10px",
            },
          }}
        >
          {messages.map((msg) => (
            <ListItem
              key={msg.id}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.user === userEmail ? "flex-end" : "flex-start",
                p: 1,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  maxWidth: "70%",
                  bgcolor:
                    msg.user === userEmail ? "primary.light" : "grey.200",
                  color: msg.user === userEmail ? "white" : "text.primary",
                  p: 1.5,
                  borderRadius: 2,
                  boxShadow: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                  <Avatar
                    sx={{
                      width: 24,
                      height: 24,
                      mr: 1,
                      bgcolor:
                        msg.user === userEmail ? "primary.dark" : "grey.500",
                    }}
                  >
                    {msg.user.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                    {msg.user}
                  </Typography>
                </Box>
                <Typography variant="body1">{msg.text}</Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    textAlign: "right",
                    opacity: 0.7,
                    mt: 0.5,
                  }}
                >
                  {msg.timestamp?.toDate().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
              </Box>
            </ListItem>
          ))}
          <div ref={messagesEndRef} />
        </List>

        <Box
          component="form"
          onSubmit={handleSendMessage}
          sx={{ display: "flex", gap: 1, mt: 2 }}
        >
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Mesajınızı yazın..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "20px",
                backgroundColor: "background.paper",
              },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={!message.trim()}
            sx={{
              minWidth: "56px",
              height: "56px",
              borderRadius: "50%",
              p: 0,
            }}
          >
            <SendIcon />
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Chat;
