import React from "react";
import { useParams } from "react-router-dom";
import Post from "../components/Forum/Post";
import AppLayout from "../components/layout/AppLayout";
import "./PostPage.css";

const PostPage = () => {
  const { postId } = useParams();
  return (
    <AppLayout>
      <Post postId={postId} />
    </AppLayout>
  );
};

export default PostPage;
