import React from "react";
import { useParams } from "react-router-dom";
import Post from "../components/Forum/Post";
import "./PostPage.css";

const PostPage = () => {
  const { postId } = useParams();
  return <Post postId={postId} />;
};

export default PostPage;
