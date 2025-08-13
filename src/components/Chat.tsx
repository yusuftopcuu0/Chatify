import { useEffect, useState, useRef, Fragment as ReactFragment } from "react";
import { auth, db } from "../services/firebaseConfig";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuthStore } from "../store/authStore";
import { useTheme, useMediaQuery } from "@mui/material";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  Button,
  Paper,
  Typography,
  TextField,
  Box,
  List,
  ListItem,
  Avatar,
  ListItemText,
  Divider,
  ListItemButton,
  InputAdornment,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import LogoutIcon from "@mui/icons-material/Logout";
import ChatIcon from "@mui/icons-material/Chat";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SearchIcon from "@mui/icons-material/Search";
import DoneAllIcon from "@mui/icons-material/DoneAll";

interface Message {
  id: string;
  text: string;
  user: string;
  timestamp: Timestamp;
  read?: boolean;
}

interface Chat {
  id: string;
  participants: string[];
  participantData?: {
    [email: string]: {
      username: string;
    };
  };
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  createdAt: Timestamp;
}

const Chat = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [newChatEmail, setNewChatEmail] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [showChatList, setShowChatList] = useState(!isMobile);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const email = user.email;
        setUserEmail(email);

        const chatsQuery = query(
          collection(db, "chats"),
          where("participants", "array-contains", email)
        );

        const unsubscribeChats = onSnapshot(
          chatsQuery,
          async (querySnapshot) => {
            const chatsList: Chat[] = [];

            for (const doc of querySnapshot.docs) {
              const chatData = doc.data() as Omit<Chat, "id">;
              chatsList.push({
                id: doc.id,
                ...chatData,
                participantData: chatData.participantData || {},
              });
            }

            setChats(chatsList);

            if (chatsList.length > 0 && !selectedChat) {
              setSelectedChat(chatsList[0].id);
            }
          }
        );

        return () => unsubscribeChats();
      } else {
        navigate("/");
      }
    });

    return () => unsubscribe();
  }, [navigate, selectedChat]);

  // Update message read status when chat is opened or messages are viewed
  const updateMessageReadStatus = async (
    chatId: string,
    currentUserEmail: string
  ) => {
    if (!chatId || !currentUserEmail) return;

    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(
      messagesRef,
      where("user", "!=", currentUserEmail),
      where("read", "!=", true) // Changed to handle both undefined and false cases
    );

    try {
      const querySnapshot = await getDocs(q);
      const batch: Promise<void>[] = [];

      querySnapshot.forEach((doc) => {
        batch.push(updateDoc(doc.ref, { read: true }));
      });

      if (batch.length > 0) {
        await Promise.all(batch);
      }
    } catch (error) {
      console.error("Error updating read status:", error);
    }
  };

  useEffect(() => {
    if (!selectedChat || !userEmail) return;

    const messagesQuery = query(
      collection(db, "chats", selectedChat, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, (querySnapshot) => {
      const messagesList: Message[] = [];
      querySnapshot.forEach((doc) => {
        messagesList.push({
          id: doc.id,
          read: doc.data().read || false,
          ...doc.data(),
        } as Message);
      });
      setMessages(messagesList);

      // Update read status when messages are loaded
      updateMessageReadStatus(selectedChat, userEmail);
    });

    return () => unsubscribeMessages();
  }, [selectedChat, userEmail]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatEmail.trim() || !userEmail) return;

    if (newChatEmail === userEmail) {
      toast.error(
        "Kendinizle sohbet başlatamazsınız! Biz bunu daha önceden düşündük :))"
      );
      return;
    }

    try {
      const querySnapshot = await getDoc(
        doc(db, "chats", `${userEmail}_${newChatEmail}`)
      );

      if (querySnapshot.exists()) {
        toast.error("Bu sohbet zaten mevcut!");
        setSelectedChat(querySnapshot.id);
      } else {
        const currentUser = auth.currentUser;
        const currentUserEmail = currentUser?.email || "";
        const currentUsername =
          currentUser?.displayName || currentUserEmail.split("@")[0];

        const otherUsername = newChatEmail.split("@")[0];

        const newChat = {
          participants: [userEmail, newChatEmail].sort(),
          participantData: {
            [currentUserEmail]: { username: currentUsername },
            [newChatEmail]: { username: otherUsername },
          },
          lastMessage: "",
          lastMessageTime: serverTimestamp(),
          createdAt: serverTimestamp(),
        };

        const chatRef = await addDoc(collection(db, "chats"), newChat);
        setSelectedChat(chatRef.id);
      }

      setNewChatEmail("");
    } catch (error) {
      console.error("Error creating chat: ", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() === "" || !userEmail || !selectedChat) return;

    try {
      await addDoc(collection(db, "chats", selectedChat, "messages"), {
        text: message,
        user: userEmail,
        timestamp: serverTimestamp(),
        read: false,
      });

      const chatRef = doc(db, "chats", selectedChat);
      await setDoc(
        chatRef,
        {
          lastMessage: message,
          lastMessageTime: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage("");
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  const getChatName = (chat: Chat) => {
    if (!userEmail) return "";
    const otherParticipantEmail =
      chat.participants.find((p) => p !== userEmail) || "";

    if (chat.participantData?.[otherParticipantEmail]?.username) {
      return chat.participantData[otherParticipantEmail].username;
    }

    return otherParticipantEmail.split("@")[0] || "Chat";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as HTMLInputElement;
    setSearch(target.value);
  };

  const filteredChats = chats.filter((chat) => {
    if (!search.trim()) return true;
    const searchTerm = search.toLowerCase();
    const chatName = getChatName(chat).toLowerCase();
    const participantEmails = chat.participants.join(" ").toLowerCase();
    return (
      chatName.includes(searchTerm) || participantEmails.includes(searchTerm)
    );
  });

  // Toggle chat list on mobile
  const toggleChatList = () => {
    setShowChatList(!showChatList);
  };

  // Close chat list when a chat is selected on mobile
  useEffect(() => {
    if (isMobile && selectedChat) {
      setShowChatList(false);
    }
  }, [selectedChat, isMobile]);

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        maxWidth: "100vw",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexGrow: 1,
          overflow: "hidden",
          width: "100%",
          position: "relative",
        }}
      >
        {/* Chat List Panel */}
        <Paper
          elevation={3}
          sx={{
            width: { xs: "100%", md: "25%" },
            display: { xs: showChatList ? "flex" : "none", md: "flex" },
            flexDirection: "column",
            overflow: "hidden",
            bgcolor: "#f0f2f5",
            position: { xs: "absolute", md: "relative" },
            height: "100%",
            zIndex: 10,
            maxWidth: { xs: "100%", md: "400px" },
          }}
        >
          <Box sx={{ p: 2, borderBottom: "1px solid rgba(0,0,0,0.12)" }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Sohbetler
              </Typography>
              {/* {isMobile && (
                <Button
                  onClick={toggleChatList}
                  size="small"
                  sx={{ display: { xs: "block", md: "none" } }}
                >
                  Kapat
                </Button>
              )} */}
            </Box>
            <form
              onSubmit={handleCreateChat}
              style={{ display: "flex", gap: 8, marginTop: 8 }}
            >
              <TextField
                size="small"
                placeholder="E-posta ekle"
                value={newChatEmail}
                onChange={(e) => setNewChatEmail(e.target.value)}
                fullWidth
              />
              <Button
                type="submit"
                variant="contained"
                size="small"
                startIcon={<PersonAddIcon />}
              >
                Ekle
              </Button>
            </form>
            <form
              onSubmit={handleSearch}
              style={{ display: "flex", gap: 8, marginTop: 8 }}
            >
              <TextField
                size="small"
                placeholder="Kişi veya e-posta ara"
                value={search}
                onChange={handleSearch}
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </form>
            <Button
              onClick={handleLogout}
              variant="contained"
              color="error"
              startIcon={<LogoutIcon />}
              sx={{ width: "100%", mt: 2 }}
            >
              Çıkış
            </Button>
          </Box>
          <List sx={{ overflowY: "auto", flexGrow: 1 }}>
            {filteredChats.map((chat) => (
              <div key={chat.id}>
                <ListItemButton
                  selected={selectedChat === chat.id}
                  onClick={() => setSelectedChat(chat.id)}
                >
                  <Avatar sx={{ mr: 2, bgcolor: "primary.main" }}>
                    {getChatName(chat).charAt(0).toUpperCase()}
                  </Avatar>
                  <ListItemText
                    primary={getChatName(chat)}
                    secondary={chat.lastMessage || "Henüz mesaj yok"}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </ListItemButton>
                <Divider />
              </div>
            ))}
            {filteredChats.length === 0 && (
              <ListItem>
                <ListItemText
                  primary="Henüz sohbet yok"
                  secondary="Yeni bir sohbet başlatmak için yukarıdan e-posta adresi ekleyin"
                />
              </ListItem>
            )}
          </List>
        </Paper>

        {/* Chat Area */}
        <Paper
          elevation={3}
          sx={{
            flexGrow: 1,
            display: "flex",
            width: { xs: "100%", md: "75%" },
            flexDirection: "column",
            overflow: "hidden",
            bgcolor: "#e5ddd5",
            position: "relative",
          }}
        >
          {/* Mobile header with back button */}
          {isMobile && selectedChat && (
            <Box
              sx={{
                display: { xs: "flex", md: "none" },
                alignItems: "center",
                p: 1,
                bgcolor: "primary.main",
                color: "white",
              }}
            >
              <Button
                onClick={toggleChatList}
                sx={{ color: "white", minWidth: "auto", mr: 1 }}
              >
                ←
              </Button>
              <Typography variant="subtitle1" noWrap>
                {selectedChat
                  ? getChatName(chats.find((c) => c.id === selectedChat)!)
                  : "Sohbet"}
              </Typography>
            </Box>
          )}
          {selectedChat ? (
            <>
              <Box sx={{ p: 2, borderBottom: "1px solid rgba(0,0,0,0.12)" }}>
                <Typography variant="h5">
                  {selectedChat
                    ? getChatName(chats.find((c) => c.id === selectedChat)!)
                    : "Sohbet"}
                </Typography>
                <Typography variant="caption">
                  Son Mesaj Tarihi:{" "}
                  {chats
                    .find((c) => c.id === selectedChat)
                    ?.lastMessageTime?.toDate()
                    .toLocaleString()}
                </Typography>
              </Box>
              <List
                sx={{
                  flexGrow: 1,
                  overflowY: "auto",
                  p: 2,
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
                {messages.map((msg, index) => {
                  const currentDate = msg.timestamp?.toDate();
                  const prevDate = messages[index - 1]?.timestamp?.toDate();
                  const showDate =
                    !prevDate ||
                    currentDate.getDate() !== prevDate.getDate() ||
                    currentDate.getMonth() !== prevDate.getMonth() ||
                    currentDate.getFullYear() !== prevDate.getFullYear();

                  return (
                    <ReactFragment key={msg.id}>
                      {showDate && (
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            my: 1,
                            width: "100%",
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              bgcolor: "rgba(0,0,0,0.1)",
                              px: 2,
                              py: 0.5,
                              borderRadius: 4,
                              color: "text.secondary",
                            }}
                          >
                            {formatDate(currentDate)}
                          </Typography>
                        </Box>
                      )}
                      <ListItem
                        key={msg.id}
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems:
                            msg.user === userEmail ? "flex-end" : "flex-start",
                          p: 1,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            maxWidth: { xs: "85%", sm: "70%" },
                            bgcolor:
                              msg.user === userEmail ? "#dcf8c6" : "#ffffff",
                            color: "text.primary",
                            p: 1.5,
                            borderRadius: 2,
                            boxShadow: 1,
                            wordBreak: "break-word",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              mb: 0.5,
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 24,
                                height: 24,
                                mr: 1,
                                bgcolor:
                                  msg.user === userEmail
                                    ? "primary.dark"
                                    : "grey.500",
                              }}
                            >
                              {msg.user.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: "bold" }}
                            >
                              {useAuthStore.getState().user?.username ||
                                msg.user.split("@")[0]}
                            </Typography>
                          </Box>
                          <Typography variant="body1">{msg.text}</Typography>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 0.5,
                              mt: 0.5,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                opacity: 0.7,
                              }}
                            >
                              {msg.timestamp?.toDate().toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Typography>
                            {msg.user === userEmail && (
                              <DoneAllIcon
                                fontSize="small"
                                sx={{
                                  opacity: 0.7,
                                  color: msg.read ? "#1976d2" : "inherit",
                                  fontSize: "1rem",
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                      </ListItem>
                    </ReactFragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </List>

              <Box
                component="form"
                onSubmit={handleSendMessage}
                sx={{
                  display: "flex",
                  gap: 1,
                  p: { xs: 1, sm: 2 },
                  borderTop: "1px solid rgba(0,0,0,0.12)",
                  position: "sticky",
                  bottom: 0,
                  bgcolor: "background.paper",
                  zIndex: 1,
                }}
              >
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Mesajınızı yazın..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  size="small"
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={!message.trim()}
                  sx={{
                    minWidth: "auto",
                    "& .MuiButton-endIcon": {
                      margin: 0,
                    },
                    "& .MuiButton-startIcon": {
                      margin: 0,
                    },
                  }}
                >
                  <SendIcon />
                  <Box
                    component="span"
                    sx={{ display: { xs: "none", sm: "inline" }, ml: 1 }}
                  >
                    Gönder
                  </Box>
                </Button>
              </Box>
            </>
          ) : (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                textAlign: "center",
                p: 4,
              }}
            >
              <ChatIcon sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Sohbet seçin veya yeni bir sohbet başlatın
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Sol taraftan bir sohbet seçin veya yeni bir kişi ekleyerek
                sohbet başlatın.
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default Chat;
