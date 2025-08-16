import { useEffect, useState, useRef, Fragment } from "react";
import { auth, db } from "../services/firebaseConfig";

const usersCollection = collection(db, "users");
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
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
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
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
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
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
  edited?: boolean;
  editedAt?: Timestamp;
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null
  );
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedMessageText, setEditedMessageText] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

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
            let currentSelectedChatExists = false;

            for (const doc of querySnapshot.docs) {
              const chatData = doc.data() as Omit<Chat, "id">;
              if (doc.id === selectedChat) {
                currentSelectedChatExists = true;
              }
              chatsList.push({
                id: doc.id,
                ...chatData,
                participantData: chatData.participantData || {},
              });
            }

            setChats(chatsList);

            // Only update selectedChat if it's not set or the current selected chat no longer exists
            if (chatsList.length > 0) {
              if (!selectedChat) {
                const sortedChats = [...chatsList].sort((a, b) => {
                  if (!a.lastMessageTime && !b.lastMessageTime) return 0;
                  if (!a.lastMessageTime) return 1;
                  if (!b.lastMessageTime) return -1;
                  return (
                    b.lastMessageTime.toMillis() - a.lastMessageTime.toMillis()
                  );
                });
                setSelectedChat(sortedChats[0].id);
              } else if (!currentSelectedChatExists) {
                const sortedChats = [...chatsList].sort((a, b) => {
                  if (!a.lastMessageTime && !b.lastMessageTime) return 0;
                  if (!a.lastMessageTime) return 1;
                  if (!b.lastMessageTime) return -1;
                  return (
                    b.lastMessageTime.toMillis() - a.lastMessageTime.toMillis()
                  );
                });
                setSelectedChat(sortedChats[0].id);
              }
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

  const updateMessageReadStatus = async (
    chatId: string,
    currentUserEmail: string
  ) => {
    if (!chatId || !currentUserEmail) return;

    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(
      messagesRef,
      where("user", "!=", currentUserEmail),
      where("read", "!=", true)
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
    if (!date) return "";
    try {
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = String(date.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
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
      toast.error("Kendinizle sohbet başlatamazsınız!");
      return;
    }

    try {
      const userQuery = query(
        usersCollection,
        where("email", "==", newChatEmail)
      );
      const querySnapshot = await getDocs(userQuery);

      if (querySnapshot.empty) {
        toast.error("Bu e-posta ile kayıtlı kullanıcı bulunamadı.");
        return;
      }

      const chatQuery = query(
        collection(db, "chats"),
        where("participants", "array-contains", userEmail)
      );

      const chatSnapshot = await getDocs(chatQuery);
      const existingChat = chatSnapshot.docs.find((doc) => {
        const data = doc.data() as Chat;
        return data.participants.includes(newChatEmail);
      });

      if (existingChat) {
        toast.info("Bu sohbet zaten mevcut!");
        setSelectedChat(existingChat.id);
        return;
      }

      const currentUser = auth.currentUser;
      const currentUsername =
        currentUser?.displayName || userEmail.split("@")[0];
      const otherUsername = newChatEmail.split("@")[0];

      const newChat = {
        participants: [userEmail, newChatEmail].sort(),
        participantData: {
          [userEmail]: { username: currentUsername },
          [newChatEmail]: { username: otherUsername },
        },
        lastMessage: "",
        lastMessageTime: serverTimestamp(),
        createdAt: serverTimestamp(),
      };

      const chatRef = await addDoc(collection(db, "chats"), newChat);
      setSelectedChat(chatRef.id);
      setNewChatEmail("");
    } catch (error) {
      console.error("Error creating chat: ", error);
      toast.error("Sohbet oluşturulurken bir hata oluştu");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() === "" || !userEmail || !selectedChat) return;

    try {
      const messageRef = await addDoc(
        collection(db, "chats", selectedChat, "messages"),
        {
          text: message,
          user: userEmail,
          timestamp: serverTimestamp(),
          read: false,
        }
      );

      const chatRef = doc(db, "chats", selectedChat);
      await setDoc(
        chatRef,
        {
          lastMessage: message,
          lastMessageTime: serverTimestamp(),
          lastMessageId: messageRef.id,
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

  const filteredChats = chats
    .filter((chat) => {
      if (!search.trim()) return true;
      const searchTerm = search.toLowerCase();
      const chatName = getChatName(chat).toLowerCase();
      const participantEmails = chat.participants.join(" ").toLowerCase();
      return (
        chatName.includes(searchTerm) || participantEmails.includes(searchTerm)
      );
    })
    .sort((a, b) => {
      if (!a.lastMessageTime && !b.lastMessageTime) return 0;
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;

      return b.lastMessageTime.toMillis() - a.lastMessageTime.toMillis();
    });

  const toggleChatList = () => {
    setShowChatList(!showChatList);
  };

  const handleChatSelect = (chatId: string) => {
    setSelectedChat(chatId);
    if (isMobile) {
      setShowChatList(false);
    }
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    messageId: string,
    messageText: string
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedMessageId(messageId);
    setEditedMessageText(messageText);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMessageId(null);
  };

  const handleDeleteChat = async () => {
    if (!chatToDelete) return;

    try {
      await deleteDoc(doc(db, "chats", chatToDelete));

      const messagesRef = collection(db, "chats", chatToDelete, "messages");
      const messagesSnapshot = await getDocs(messagesRef);
      const deletePromises = messagesSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      toast.success("Sohbet başarıyla silindi");
      setChatToDelete(null);
      setDeleteDialogOpen(false);

      if (selectedChat === chatToDelete) {
        setSelectedChat(null);
      }
    } catch (error) {
      console.error("Error deleting chat: ", error);
      toast.error("Sohbet silinirken bir hata oluştu");
      setDeleteDialogOpen(false);
    }
  };

  const openDeleteDialog = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatToDelete(chatId);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setChatToDelete(null);
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessageId || !selectedChat) {
      handleMenuClose();
      return;
    }

    try {
      await deleteDoc(
        doc(db, "chats", selectedChat, "messages", selectedMessageId)
      );
      toast.success("Mesaj silindi");
    } catch (error) {
      console.error("Error deleting message: ", error);
      toast.error("Mesaj silinirken bir hata oluştu");
    } finally {
      handleMenuClose();
    }
  };

  const handleEditMessage = async () => {
    if (!selectedMessageId || !selectedChat || !editedMessageText.trim()) {
      handleMenuClose();
      return;
    }

    try {
      await updateDoc(
        doc(db, "chats", selectedChat, "messages", selectedMessageId),
        {
          text: editedMessageText.trim(),
          edited: true,
          editedAt: serverTimestamp(),
        }
      );
      setEditingMessageId(null);
      setEditedMessageText("");
    } catch (error) {
      console.error("Error updating message: ", error);
      toast.error("Mesaj güncellenirken bir hata oluştu");
    } finally {
      handleMenuClose();
    }
  };

  const startEditing = (messageId: string, text: string) => {
    setEditingMessageId(messageId);
    setEditedMessageText(text);
    setAnchorEl(null);
  };

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
                  onClick={() => handleChatSelect(chat.id)}
                  sx={{
                    position: "relative",
                    "&:hover .delete-chat-button": {
                      opacity: 1,
                    },
                  }}
                >
                  <Avatar sx={{ mr: 2, bgcolor: "primary.main" }}>
                    {getChatName(chat).charAt(0).toUpperCase()}
                  </Avatar>
                  <ListItemText
                    primary={getChatName(chat)}
                    secondary={chat.lastMessage || "Henüz mesaj yok"}
                    secondaryTypographyProps={{ noWrap: true }}
                    sx={{ pr: 4 }}
                  />
                  <IconButton
                    className="delete-chat-button"
                    onClick={(e) => openDeleteDialog(chat.id, e)}
                    size="small"
                    sx={{
                      position: "absolute",
                      right: 8,
                      opacity: 0,
                      transition: "opacity 0.2s",
                      "&:hover": {
                        color: "error.main",
                        backgroundColor: "rgba(211, 47, 47, 0.04)",
                      },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
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

          {/* Chat'i sil */}
          <Dialog
            open={deleteDialogOpen}
            onClose={closeDeleteDialog}
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-description"
          >
            <DialogTitle id="delete-dialog-title">Sohbeti Sil</DialogTitle>
            <DialogContent>
              <DialogContentText id="delete-dialog-description">
                Bu sohbeti silmek istediğinizden emin misiniz? Bu işlem geri
                alınamaz.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeDeleteDialog} color="primary">
                İptal
              </Button>
              <Button onClick={handleDeleteChat} color="error" autoFocus>
                Sil
              </Button>
            </DialogActions>
          </Dialog>
        </Paper>

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
                  if (!msg.timestamp) return null;

                  const currentDate = msg.timestamp.toDate();
                  const prevDate = messages[index - 1]?.timestamp?.toDate();

                  const showDate =
                    !prevDate ||
                    (currentDate &&
                      prevDate &&
                      (currentDate.getDate() !== prevDate.getDate() ||
                        currentDate.getMonth() !== prevDate.getMonth() ||
                        currentDate.getFullYear() !== prevDate.getFullYear()));

                  return (
                    <Fragment key={msg.id}>
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
                      <Box
                        key={msg.id}
                        sx={{
                          display: "flex",
                          justifyContent:
                            msg.user === userEmail ? "flex-end" : "flex-start",
                          mb: 1,
                          width: "100%",
                          position: "relative",
                          "&:hover .message-actions": {
                            opacity: 1,
                          },
                        }}
                      >
                        {msg.user === userEmail && (
                          <Box
                            className="message-actions"
                            sx={{
                              position: "absolute",
                              right: 0,
                              top: "50%",
                              transform: "translateY(-50%)",
                              opacity: 0,
                              transition: "opacity 0.2s",
                              zIndex: 1,
                            }}
                          >
                            <IconButton
                              size="small"
                              onClick={(e) =>
                                handleMenuOpen(e, msg.id, msg.text)
                              }
                              sx={{
                                backgroundColor: "rgba(0,0,0,0.1)",
                                "&:hover": {
                                  backgroundColor: "rgba(0,0,0,0.2)",
                                },
                              }}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        )}
                        <Paper
                          elevation={1}
                          sx={{
                            p: 1.5,
                            maxWidth: "70%",
                            bgcolor:
                              msg.user === userEmail ? "#0084ff" : "#e9e9eb",
                            color: msg.user === userEmail ? "white" : "black",
                            borderRadius: 2,
                            borderBottomRightRadius:
                              msg.user === userEmail ? 2 : 18,
                            borderBottomLeftRadius:
                              msg.user === userEmail ? 18 : 2,
                            position: "relative",
                          }}
                        >
                          {editingMessageId === msg.id ? (
                            <Box>
                              <TextField
                                fullWidth
                                multiline
                                value={editedMessageText}
                                onChange={(e) =>
                                  setEditedMessageText(e.target.value)
                                }
                                variant="outlined"
                                size="small"
                                sx={{
                                  mb: 1,
                                  "& .MuiOutlinedInput-root": {
                                    color:
                                      msg.user === userEmail
                                        ? "white"
                                        : "black",
                                    "& fieldset": {
                                      borderColor: "rgba(255, 255, 255, 0.5)",
                                    },
                                    "&:hover fieldset": {
                                      borderColor: "rgba(255, 255, 255, 0.8)",
                                    },
                                  },
                                }}
                                autoFocus
                              />
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "flex-end",
                                  gap: 1,
                                }}
                              >
                                <Button
                                  size="small"
                                  onClick={() => setEditingMessageId(null)}
                                  sx={{
                                    color:
                                      msg.user === userEmail
                                        ? "white"
                                        : "inherit",
                                  }}
                                >
                                  İptal
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={handleEditMessage}
                                  disabled={!editedMessageText.trim()}
                                >
                                  Kaydet
                                </Button>
                              </Box>
                            </Box>
                          ) : (
                            <Typography variant="body1">{msg.text}</Typography>
                          )}
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "flex-end",
                              alignItems: "center",
                              mt: 0.5,
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: "0.7rem",
                                opacity: 0.7,
                                color:
                                  msg.user === userEmail
                                    ? "rgba(255,255,255,0.8)"
                                    : "rgba(0,0,0,0.6)",
                              }}
                            >
                              {msg.timestamp?.toDate
                                ? new Date(
                                    msg.timestamp.toDate()
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                              {msg.edited && (
                                <Typography
                                  component="span"
                                  variant="caption"
                                  sx={{
                                    fontStyle: "italic",
                                    ml: 0.5,
                                    opacity: 0.7,
                                  }}
                                >
                                  (düzenlendi)
                                </Typography>
                              )}
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
                        </Paper>
                      </Box>
                    </Fragment>
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

      {/* Mesaj Aksiyon Menü (Düzenle, Sil) */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            if (selectedMessageId) {
              startEditing(selectedMessageId, editedMessageText);
            }
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="body2">Düzenle</Typography>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteMessage();
          }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <Typography variant="body2" color="error">
            Mesajı Sil
          </Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Chat;
