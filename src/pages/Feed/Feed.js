import React, { Component, Fragment } from 'react';

import Post from '../../components/Feed/Post/Post';
import Button from '../../components/Button/Button';
import FeedEdit from '../../components/Feed/FeedEdit/FeedEdit';
import Input from '../../components/Form/Input/Input';
import Paginator from '../../components/Paginator/Paginator';
import Loader from '../../components/Loader/Loader';
import ErrorHandler from '../../components/ErrorHandler/ErrorHandler';
import './Feed.css';

const API_URL = process.env.REACT_APP_API_URL

class Feed extends Component {
  state = {
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: '',
    postPage: 1,
    postsLoading: true,
    editLoading: false
  };
  
  componentDidMount() {
    fetch(`${API_URL}/auth/status`,{ headers: { Authorization : `Bearer ${this.props.token}`} })
    .then(res=>{ if (res.status !== 200) { throw new Error('Failed to fetch user status.'); }
      return res.json()
    })
    .then(resData=>{ this.setState({status: resData.status});})
    .catch(error=>{ this.catchError(error) })
    this.loadPosts();
  }

  
  async loadPosts(direction) {
    if (direction) { this.setState({ postsLoading: true, posts: [] }); }
  
    let page = this.state.postPage;

    if (direction === 'next') { page++; this.setState({ postPage: page }); }
    if (direction === 'previous') { page--; this.setState({ postPage: page }); }
    try {
      const res     = await fetch(`${API_URL}/feed/posts?page=${page}`,{ headers: { Authorization : `Bearer ${this.props.token}`} })
      if (res.status !== 200) { throw new Error('Failed to fetch posts.'); }
      const resData = await res.json()
      this.setState({
        posts: resData.posts.map(post => ({...post,imagePath: post.imageUrl}) ),
        totalPosts: resData.totalItems,
        postsLoading: false
      })
    } catch (error) {
      this.catchError(error)
    }
  };


   statusUpdateHandler = async (event)=>{
    event.preventDefault();

    try {
      const res     = await fetch(`${API_URL}/auth/status`,{
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.props.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify( {status: this.state.status} )
      })
      if(res.status!==200 && res.status!==202){ 
        throw new Error('Something went wrong try again later')
      }
      const resData = await res.json();
      this.setState({
        status : resData.status
      });
    } catch (error) {
      this.catchError(error)
    }
  };


  newPostHandler = () => {
    this.setState({ isEditing: true });
  };


  startEditPostHandler = postId => {
    this.setState(prevState => {
      const loadedPost = { ...prevState.posts.find(p => p._id === postId) };

      return {
        isEditing: true,
        editPost: loadedPost
      };
    });
  };


  cancelEditHandler = () => {
    this.setState({ isEditing: false, editPost: null });
  };


  finishEditHandler = async ({title,content,image}) => {
    this.setState({ editLoading: true });
    
    let formData = new FormData()
    formData.append('title',title)
    formData.append('content',content)
    formData.append('image',image)

    let url    = `${API_URL}/feed/post`;
    let method = "POST"
    if (this.state.editPost) { url = `${API_URL}/feed/post/${this.state.editPost._id}`; method= "PUT" }

    try{
        const res = await fetch(url,{ method, body : formData, headers : { Authorization : `Bearer ${this.props.token}`} })
        if (res.status !== 200 && res.status !== 201) { let e = await res.json(); throw new Error(e.message) }
        const resData = await res.json()

        this.setState(prevState => {
            let updatedPosts = [...prevState.posts];
        
            if(prevState.editPost){
                const postIndex = prevState.posts.findIndex(p => p._id === prevState.editPost._id);
                updatedPosts[postIndex] = resData.post;
            } else  {
                updatedPosts = prevState.posts.concat(resData.post);
            }
        
            return { posts: updatedPosts, isEditing: false, editPost: null, editLoading: false }
          })
        }catch (error){
          this.setState({ isEditing: false, editPost: null, editLoading: false,error});
        }
        this.loadPosts()
  }


  statusInputChangeHandler = (input, value) => { this.setState({ status: value }) }


  deletePostHandler = postId => {
    this.setState({ postsLoading: true });
    fetch(`${API_URL}/feed/post/${postId}`, { method: "DELETE",headers: {Authorization : `Bearer ${this.props.token}`}})
      .then(res => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error('Deleting a post failed!');
        }
        return res.json();
      })
      .then(resData => {
        this.setState(prevState => {
          const updatedPosts = prevState.posts.filter(p => p._id !== postId);
          return { posts: updatedPosts, postsLoading: false };
        });
      })
      .catch(err => {
        this.setState({ postsLoading: false });
      });

      this.loadPosts()
  };


  errorHandler = () => { this.setState({ error: null }) }


  catchError = error => { this.setState({ error }) }


  render() {
      return (
        <Fragment>
          <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
          <FeedEdit editing={this.state.isEditing} selectedPost={this.state.editPost} loading={this.state.editLoading} onCancelEdit={this.cancelEditHandler} onFinishEdit={this.finishEditHandler} />

          <section className="feed__status">
            <form onSubmit={this.statusUpdateHandler}>
              <Input type="text" placeholder="Your status" control="input" onChange={this.statusInputChangeHandler} value={this.state.status} />
              <Button mode="flat" type="submit"> Update </Button>
            </form>
          </section>

          <section className="feed__control">
            <Button mode="raised" design="accent" onClick={this.newPostHandler}> New Post </Button>
          </section>
          
          <section className="feed">
            { this.state.postsLoading && (
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <Loader />
              </div>
            )}

            {this.state.posts.length <= 0 && !this.state.postsLoading ? (
              <p style={{ textAlign: 'center' }}>No posts found.</p>
            ) : null}

            {!this.state.postsLoading && (
              <Paginator onPrevious={this.loadPosts.bind(this, 'previous')} onNext={this.loadPosts.bind(this, 'next')} lastPage={Math.ceil(this.state.totalPosts / 2)} currentPage={this.state.postPage} >
                {this.state.posts.map(post => (
                  <Post key={post._id} id={post._id} creatorId = {post.creator._id} logingUserId = {this.props.userId} author={post.creator.name} date={new Date(post.createdAt).toLocaleDateString('en-US')} title={post.title} image={post.imageUrl} content={post.content} onStartEdit={this.startEditPostHandler.bind(this, post._id)} onDelete={this.deletePostHandler.bind(this, post._id)} />
                ))}
              </Paginator>
            )}
          </section>
        
        </Fragment>
        
      );
    }
}

export default Feed;