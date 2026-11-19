#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>
#import <AppKit/AppKit.h>
#import <ImageIO/ImageIO.h>

int main(int argc, const char *argv[]) {
  @autoreleasepool {
    if (argc != 3) { fprintf(stderr, "Usage: render-snake snake.json output.mp4\n"); return 1; }
    NSDictionary *plan = [NSJSONSerialization JSONObjectWithData:[NSData dataWithContentsOfFile:@(argv[1])] options:0 error:nil];
    if (!plan) return 1;
    NSURL *output = [NSURL fileURLWithPath:@(argv[2])];
    int width = [plan[@"width"] intValue], height = [plan[@"height"] intValue];
    int fps = [plan[@"fps"] intValue], seconds = [plan[@"seconds"] intValue];
    NSArray *letters = plan[@"letters"], *frames = plan[@"frames"], *layout = plan[@"layout"];
    CGMutablePathRef paths[6];
    for (int i = 0; i < 6; i++) {
      paths[i] = CGPathCreateMutable();
      for (NSArray *c in letters[i][@"commands"]) {
        NSString *op = c[0];
        if ([op isEqual:@"M"]) CGPathMoveToPoint(paths[i], NULL, [c[1] doubleValue], [c[2] doubleValue]);
        else if ([op isEqual:@"L"]) CGPathAddLineToPoint(paths[i], NULL, [c[1] doubleValue], [c[2] doubleValue]);
        else if ([op isEqual:@"C"]) CGPathAddCurveToPoint(paths[i], NULL, [c[1] doubleValue], [c[2] doubleValue], [c[3] doubleValue], [c[4] doubleValue], [c[5] doubleValue], [c[6] doubleValue]);
        else CGPathCloseSubpath(paths[i]);
      }
    }
    NSError *error = nil;
    AVAssetWriter *writer = [[AVAssetWriter alloc] initWithURL:output fileType:AVFileTypeMPEG4 error:&error];
    if (!writer) { NSLog(@"%@", error); return 1; }
    writer.shouldOptimizeForNetworkUse = YES;
    AVAssetWriterInput *track = [AVAssetWriterInput assetWriterInputWithMediaType:AVMediaTypeVideo outputSettings:@{
      AVVideoCodecKey: AVVideoCodecTypeH264, AVVideoWidthKey: @(width), AVVideoHeightKey: @(height),
      AVVideoCompressionPropertiesKey: @{AVVideoAverageBitRateKey: @10000000,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel}
    }];
    AVAssetWriterInputPixelBufferAdaptor *adaptor = [AVAssetWriterInputPixelBufferAdaptor
      assetWriterInputPixelBufferAdaptorWithAssetWriterInput:track sourcePixelBufferAttributes:@{
        (NSString *)kCVPixelBufferPixelFormatTypeKey: @(kCVPixelFormatType_32ARGB),
        (NSString *)kCVPixelBufferWidthKey: @(width), (NSString *)kCVPixelBufferHeightKey: @(height),
        (NSString *)kCVPixelBufferCGImageCompatibilityKey: @YES,
        (NSString *)kCVPixelBufferCGBitmapContextCompatibilityKey: @YES
      }];
    [writer addInput:track];
    if (![writer startWriting]) { NSLog(@"%@", writer.error); return 1; }
    [writer startSessionAtSourceTime:kCMTimeZero];
    CGColorSpaceRef colors = CGColorSpaceCreateDeviceRGB();
    for (int frame = 0; frame < frames.count; frame++) {
      @autoreleasepool {
        while (!track.readyForMoreMediaData) {
          if (writer.status == AVAssetWriterStatusFailed) { NSLog(@"%@", writer.error); return 1; }
          [NSThread sleepForTimeInterval:0.005];
        }
        CVPixelBufferRef buffer = NULL;
        if (CVPixelBufferPoolCreatePixelBuffer(NULL, adaptor.pixelBufferPool, &buffer) != kCVReturnSuccess) return 1;
        CVPixelBufferLockBaseAddress(buffer, 0);
        CGContextRef ctx = CGBitmapContextCreate(CVPixelBufferGetBaseAddress(buffer), width, height, 8,
          CVPixelBufferGetBytesPerRow(buffer), colors, kCGImageAlphaNoneSkipFirst);
        CGContextSetRGBFillColor(ctx, 1, 1, 1, 1);
        CGContextFillRect(ctx, CGRectMake(0, 0, width, height));
        CGContextTranslateCTM(ctx, 0, height);
        CGContextScaleCTM(ctx, 1, -1);
        CGContextTranslateCTM(ctx, [layout[1] doubleValue], [layout[2] doubleValue]);
        CGContextScaleCTM(ctx, [layout[0] doubleValue], [layout[0] doubleValue]);
        CGContextSetRGBFillColor(ctx, 0, 0, 0, 1);
        for (int i = 0; i < 6; i++) {
          NSArray *t = frames[frame][i];
          CGContextSaveGState(ctx);
          CGContextConcatCTM(ctx, CGAffineTransformMake([t[0] doubleValue], [t[1] doubleValue], [t[2] doubleValue], [t[3] doubleValue], [t[4] doubleValue], [t[5] doubleValue]));
          CGContextAddPath(ctx, paths[i]);
          CGContextFillPath(ctx);
          CGContextRestoreGState(ctx);
        }
        if (frame % 60 == 0) {
          CGImageRef preview = CGBitmapContextCreateImage(ctx);
          NSURL *path = [[output URLByDeletingLastPathComponent] URLByAppendingPathComponent:[NSString stringWithFormat:@"snake-%03d.png",frame]];
          CGImageDestinationRef dest = CGImageDestinationCreateWithURL((__bridge CFURLRef)path, CFSTR("public.png"), 1, NULL);
          CGImageDestinationAddImage(dest, preview, NULL);
          if (!CGImageDestinationFinalize(dest)) return 1;
          CFRelease(dest); CGImageRelease(preview);
        }
        CGContextRelease(ctx);
        CVPixelBufferUnlockBaseAddress(buffer, 0);
        BOOL ok = [adaptor appendPixelBuffer:buffer withPresentationTime:CMTimeMake(frame, fps)];
        CVPixelBufferRelease(buffer);
        if (!ok) { NSLog(@"%@", writer.error); return 1; }
      }
    }
    [track markAsFinished];
    [writer endSessionAtSourceTime:CMTimeMake(seconds, 1)];
    dispatch_semaphore_t done = dispatch_semaphore_create(0);
    [writer finishWritingWithCompletionHandler:^{ dispatch_semaphore_signal(done); }];
    dispatch_semaphore_wait(done, DISPATCH_TIME_FOREVER);
    for (int i=0;i<6;i++) CGPathRelease(paths[i]);
    CGColorSpaceRelease(colors);
    if (writer.status != AVAssetWriterStatusCompleted) { NSLog(@"%@", writer.error); return 1; }
    printf("MP4 exported: %s (%dx%d, %d fps, %d seconds)\n", argv[2], width, height, fps, seconds);
  }
  return 0;
}
