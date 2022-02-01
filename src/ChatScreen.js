import React from "react";
import {
  AppBar,
  Backdrop,
  CircularProgress,
  Container,
  CssBaseline,
  Grid,
  IconButton,
  List,
  TextField,
  Toolbar,
  Typography,
} from "@material-ui/core";
import { Send } from "@material-ui/icons";
import axios from "axios";
import ChatItem from "./ChatItem";
const Chat = require("twilio-chat");

class ChatScreen extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      text: "",
      messages: [],
      loading: false,
      channel: null,
    };

    this.scrollDiv = React.createRef();
  }
  joinChannel = async (channel) => {
    if (channel.channelState.status !== "joined") {
      await channel.join();
    }

    this.setState({
      channel: channel,
      loading: false,
    });

    channel.on("messageAdded", this.handleMessageAdded);
    this.scrollToBottom();
  };

  handleMessageAdded = (message) => {
    const { messages } = this.state;
    this.setState(
      {
        messages: [...messages, message],
      },
      this.scrollToBottom
    );
  };

  scrollToBottom = () => {
    const scrollHeight = this.scrollDiv.current.scrollHeight;
    const height = this.scrollDiv.current.clientHeight;
    const maxScrollTop = scrollHeight - height;
    this.scrollDiv.current.scrollTop = maxScrollTop > 0 ? maxScrollTop : 0;
  };
  componentDidMount = async () => {
    const { location } = this.props;
    const { state } = location || {};
    const { email, room } = state || {};
    let token = "";

    if (!email || !room) {
      this.props.history.replace("/");
    }

    this.setState({ loading: true });

    try {
      token = await this.getToken(email);
    } catch {
      throw new Error("Unable to get token, please reload this page");
    }
    const client = await Chat.Client.create(token);

    client.on("tokenAboutToExpire", async () => {
      const token = await this.getToken(email);
      client.updateToken(token);
    });

    client.on("tokenExpired", async () => {
      const token = await this.getToken(email);
      client.updateToken(token);
    });

    client.on("channelJoined", async (channel) => {
      // getting list of all messages since this is an existing channel
      const messages = await channel.getMessages();
      this.setState({ messages: messages.items || [] });
      this.scrollToBottom();
    });

    try {
      const channel = await client.getChannelByUniqueName(room);
      this.joinChannel(channel);
    } catch (err) {
      try {
        const channel = await client.createChannel({
          uniqueName: room,
          friendlyName: room,
        });

        this.joinChannel(channel);
      } catch {
        throw new Error("Unable to create channel, please reload this page");
      }
    }
  };

  getToken = async (email) => {
    const response = await axios.get(`http://localhost:5000/token/${email}`);
    const { data } = response;
    return data.token;
  };

  sendMessage = () => {
    const { text, channel } = this.state;
    if (text) {
      this.setState({ loading: true });
      channel.sendMessage(String(text).trim());
      this.setState({ text: "", loading: false });
    }
  };
}

export default ChatScreen;
